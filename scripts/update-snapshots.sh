#!/bin/bash

# Get the operating system
OS=$(uname -s)

if [ "$OS" != "Darwin" ]; then
  echo "Error: Screenshot regeneration is only permitted on macOS to ensure consistency with CI. To regenerate screenshots, please trigger the GitHub Workflow: '.github/workflows/regenerate-screenshots.yml'."
  exit 1
fi

npx playwright test --update-snapshots --workers=8
