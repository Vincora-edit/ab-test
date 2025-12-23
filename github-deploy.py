#!/usr/bin/env python3
"""
GitHub Auto-Deploy Script
Automatically commits and pushes changes to GitHub repository
"""

import subprocess
import os
import sys

def git_commit_and_push(client_id, tests_count):
    """Commit and push changes to GitHub"""
    try:
        # Get current directory
        repo_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(repo_dir)

        # Add tests directory
        subprocess.run(['git', 'add', 'tests/'], check=True, capture_output=True)

        # Check if there are changes to commit
        status = subprocess.run(['git', 'status', '--porcelain'],
                              capture_output=True, text=True, check=True)

        if not status.stdout.strip():
            print('ℹ️  No changes to commit')
            return True

        # Commit with message
        commit_msg = f'Update tests for client {client_id} ({tests_count} tests)'
        subprocess.run(['git', 'commit', '-m', commit_msg],
                      check=True, capture_output=True)

        # Push to GitHub
        subprocess.run(['git', 'push'], check=True, capture_output=True)

        print(f'✅ Successfully deployed to GitHub: {commit_msg}')
        return True

    except subprocess.CalledProcessError as e:
        print(f'❌ Git error: {e}')
        print(f'Output: {e.output}')
        return False
    except Exception as e:
        print(f'❌ Deployment error: {e}')
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python github-deploy.py <client_id> <tests_count>')
        sys.exit(1)

    client_id = sys.argv[1]
    tests_count = int(sys.argv[2])

    success = git_commit_and_push(client_id, tests_count)
    sys.exit(0 if success else 1)
