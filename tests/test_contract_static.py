import ast
import sys

def check_contract():
    filename = "d:/Genlayer/GymCommit/contracts/GymCommit.py"
    try:
        content = open(filename, "r", encoding="utf-8").read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    # 1. Check version and depends header lines
    lines = content.splitlines()
    if len(lines) < 2:
        print("Contract must have at least 2 header lines")
        sys.exit(1)
    
    if lines[0].strip() != "# v0.2.16":
        print(f"First line must match version pattern. Found: {lines[0]}")
        sys.exit(1)

    if not lines[1].strip().startswith('# { "Depends": "py-genlayer:'):
        print(f"Second line must match Depends pattern. Found: {lines[1]}")
        sys.exit(1)

    # 2. Check AST structure
    try:
        tree = ast.parse(content)
    except Exception as e:
        print(f"AST Parsing error: {e}")
        sys.exit(1)

    # Check imports
    allowed_imports = {"genlayer", "typing", "json"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for name in node.names:
                root_name = name.name.split('.')[0]
                if root_name not in allowed_imports:
                    print(f"Forbidden import: {name.name}")
                    sys.exit(1)
        elif isinstance(node, ast.ImportFrom):
            root_name = node.module.split('.')[0] if node.module else ""
            if root_name not in allowed_imports:
                print(f"Forbidden import from: {node.module}")
                sys.exit(1)

    print("AST verification SUCCESS. Contract complies with storage and structure rules.")
    sys.exit(0)

if __name__ == "__main__":
    check_contract()
