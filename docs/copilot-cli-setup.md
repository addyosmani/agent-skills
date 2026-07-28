# Using agent-skills with GitHub Copilot CLI

## Setup

### Installation

Copilot CLI supports installing agent skills using the same marketplace installation commands as Claude Code.

To install agent-skills globally in Copilot CLI, run the commands one at a time:

1. Add the marketplace:
```bash
/plugin marketplace add addyosmani/agent-skills
```

2. Install the plugin:
```bash
/plugin install agent-skills@addy-agent-skills
```

> **Note**: The marketplace clones repositories via SSH. If you don't have SSH keys set up on GitHub, either [add your SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) or switch to HTTPS for fetches only:
> ```bash
> git config --global url."https://github.com/".insteadOf "git@github.com:"
> ```

### Usage

Once installed, you can use any of the 20+ skills included in this repository with Copilot CLI. The skills will be automatically available for use in your sessions.

For more information on using Copilot CLI with agent skills, see the [official Copilot CLI documentation](https://docs.github.com/en/copilot/using-copilot/using-the-cli).
