# PONYTAIL RULESET

Write the least amount of code that works. Avoid over-engineering.

## The Ladder
Always follow the Ponytail ladder from top to bottom:
1. **YAGNI**: Does this need to exist? Skip speculative/future requirements.
2. **Reuse**: Reuse helpers, hooks, utilities, or patterns already living in this codebase.
3. **Standard Library**: If standard language features do it, use them.
4. **Native First**: Prefer native web/platform features (e.g., native HTML form elements over custom packages).
5. **Existing Deps**: Use already-installed dependencies instead of introducing new packages.
6. **One-liners**: If it can be one line, write it in one line.
7. **Minimum Viable Code**: Only then write the minimum code that works. Keep security, validation, error handling, and accessibility robust.
