import sys
import os
import runpy

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
backend_ask_path = os.path.join(backend_dir, "ask.py")

# Ensure backend directory is in python search path and working directory
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

if __name__ == "__main__":
    runpy.run_path(backend_ask_path, run_name="__main__")
