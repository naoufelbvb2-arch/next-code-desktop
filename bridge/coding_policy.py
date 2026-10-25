"""Narrow owner-configured synthetic scope; uses existing ToolRegistry hooks.

Application policy, not an OS sandbox. No arbitrary command or executable project
code is admitted by this temporary pure-Python verification route.
"""
import ast
import hashlib
from pathlib import Path
from coding_gateway import validate_route


def pure_python(path):
    tree = ast.parse(path.read_bytes())
    # Pure arithmetic functions only: no imports, attributes, calls, decorators,
    # annotations, defaults, assignments, comprehensions or executable top level.
    if not tree.body or len(tree.body) > 8:
        raise ValueError("CODING_PYTHON_POLICY")
    allowed = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.Return, ast.Expr,
        ast.Constant, ast.BinOp, ast.UnaryOp, ast.Name, ast.Load, ast.Add, ast.Sub,
        ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.USub, ast.UAdd)
    for node in ast.walk(tree):
        if not isinstance(node, allowed):
            raise ValueError("CODING_PYTHON_POLICY")
        if isinstance(node, ast.Constant) and (type(node.value) not in (int, float, str) or
            (isinstance(node.value, str) and len(node.value) > 200)):
            raise ValueError("CODING_PYTHON_POLICY")
    for node in tree.body:
        if not isinstance(node, ast.FunctionDef) or node.decorator_list or node.args.defaults or node.args.kw_defaults:
            raise ValueError("CODING_PYTHON_POLICY")


def install_policy(engine, route):
    from kernel.schemas import ToolResult
    workspace = engine.workspace_root.resolve(strict=True)
    validate_route(route, workspace)
    registry = engine.tool_registry
    for name in registry.list_tools():
        original = registry.get_tool(name)
        def guarded(ctx, _name=name, _original=original, **args):
            try:
                if ctx.workspace_root.resolve(strict=True) != workspace:
                    raise ValueError("CODING_SCOPE_DENIED")
                if _name == "run_command":
                    if args.get("command") != route["command"] or args.get("cwd", args.get("cwd_rel", ".")) != ".":
                        raise ValueError("CODING_COMMAND_DENIED")
                    validate_route(route, workspace)
                    for file in route["writableFiles"]:
                        pure_python(workspace / file)
                    args["timeout_sec"] = min(args.get("timeout_sec") or 30, 30)
                else:
                    path = (workspace / args.get("path", ".")).resolve(strict=True)
                    if not path.is_relative_to(workspace) or path.is_symlink():
                        raise ValueError("CODING_PATH_DENIED")
                    if _name == "apply_patch" and path.relative_to(workspace).as_posix() not in route["writableFiles"]:
                        raise ValueError("CODING_WRITE_DENIED")
                return _original(ctx, **args)
            except (ValueError, OSError, SyntaxError):
                return ToolResult(success=False, output="Denied by the owner-configured Coding workspace policy.",
                                  error_code="PERMISSION_DENIED", execution_time_ms=0)
        registry.register(name, guarded)
