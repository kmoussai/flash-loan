You are working in a large TypeScript codebase. Follow these rules:
- Reuse global types and utilities whenever possible.
- Never redefine existing types. If a type exists in src/types/*, import it.
- Keep code modular: one responsibility per file.
- Follow the project structure already present.
- Prefer readability and maintainability over brevity.
- Use consistent naming patterns from the existing codebase.
- no access to supabse from client side, create endpoint if needed so you can access db from server side
Before writing new code, check if similar logic already exists.