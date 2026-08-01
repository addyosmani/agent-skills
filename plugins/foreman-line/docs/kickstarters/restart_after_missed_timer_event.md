# Restart Notice

**VS Code restarted for an update** 

    - Your scheduled wakeup and your W0-P2 builder subagent were killed mid-flight. 
    - No completion claim was ever delivered. 
    - The builder's uncommitted work survives in C:\Repos\foreman-line-W0-P2 (spec-linter package: schema, src, test fixtures - last writes ~13:55). 
    - Re-read docs/kickstarters/foreman-line-coordinator-loop.md: a new "Crash recovery" section covers exactly this case. 
    - Follow it - treat the disk state as unclaimed, dispatch a fresh builder with a resume directive.
    - (Step 0: restate the original W0-P2 directive, inventory what exists on disk against it, state the live test count, flag gaps or half-written files.
    - STOP for your ruling), then continue the loop and re-arm your wakeup.