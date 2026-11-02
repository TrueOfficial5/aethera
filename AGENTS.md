# Permanent Development Rules

These rules apply to all future development in this project and to all files beneath this directory. Read and follow them before making changes.

## Component Reusability

- Always look for existing components before creating new ones.
- Reuse or extend existing components whenever possible.
- Shared UI elements must have consistent default styles.
- Implement variants within the shared component system and define them centrally.
- Never duplicate components to make small visual changes.
- Changes to global components must apply consistently throughout the website.
- Use shared systems for buttons, forms, cards, tables, navigation, and other recurring UI elements.

## CSS Architecture

- Use global CSS custom properties for colors, spacing, typography, borders, radii, shadows, transitions, and other design tokens.
- Keep shared component styles centralized.
- Keep page-specific styles scoped to their pages.
- Avoid inline CSS and unnecessary hardcoded values.
- Prevent conflicting or duplicated CSS rules.
- Extend existing component variants before introducing scoped overrides.

## JavaScript Architecture

- Reuse existing functions and utilities.
- Avoid duplicate logic.
- Keep modules focused on their responsibilities.
- Separate UI logic, data handling, and configuration.
- Make code easy to extend.
- Keep server information in central configuration rather than repeating it across pages.
- Keep demonstration data centralized and replaceable through a data access layer.
- Clearly identify mock data and functionality requiring a future backend. Never present mock authentication or invented backend connections as real.

## Development Workflow

- Always inspect relevant existing files before making changes.
- Understand how existing components work before modifying them.
- Prefer modifying existing files rather than creating unnecessary new ones.
- Keep changes focused on the requested task.
- Do not refactor unrelated code without a clear reason.
- Do not introduce unnecessary libraries.
- Preserve existing functionality.
- Keep the project organized and maintainable.
- Reuse the existing architecture and dependencies when appropriate. If starting from an empty project, use modular HTML, CSS, and JavaScript without unnecessary frameworks.
- Verify affected functionality, navigation, and responsive behavior with checks appropriate to the changes.
- Treat mobile usability as a requirement in every future UI change, not a final optional step. Check affected views at narrow phone widths (320–390px), tablet, and desktop, including landscape when fixed elements are involved.
- Check touch target sizes, readable text and form inputs, navigation access, safe-area spacing, horizontal overflow, long content, tables, and virtual-keyboard behavior. Preserve native touch scrolling and reduced-motion support. Report any checks that require a physical device.

## Design Consistency

- After a successful Save in any editor, close the editor and return to the page the user opened it from, preserving filters, pagination, and scroll position where possible.
- Reuse the shared editor return flow for all current and future editors. Use a sensible overview page when an editor was opened directly.
- If saving fails, keep the editor open, preserve all entered values, and display the error. Do not navigate away.

- Maintain the established premium dark gaming aesthetic.
- Follow the global design system.
- Keep components visually consistent across pages.
- Favor charcoal and dark navy surfaces, restrained accents, clear typography, and balanced spacing.
- Avoid excessive fantasy styling, decorative medieval typography, clutter, and excessive animation.
- Ensure all pages are responsive across desktop, tablet, and mobile, without unintended horizontal overflow.
- Make interactive elements accessible through semantic HTML, keyboard support, visible focus states, appropriate labels, and sufficient contrast.
- Respect reduced-motion preferences.
- Preserve the intended visual direction. Do not completely redesign working pages unless the requested task requires it.

## No Code Comments

- Do not write comments in any project source files.
- This applies to HTML, CSS, JavaScript, TypeScript, JSX, TSX, and other programming languages.
- Do not use HTML comments (`<!-- -->`), CSS comments (`/* */`), or JavaScript comments (`//` or `/* */`).
- Remove existing unnecessary comments when working on a file.
- Write clean, self-explanatory code using meaningful variable, function, and component names.
- Do not add section separators or decorative comments.
- Keep explanations and implementation notes in the final response, not inside source code.
- Preserve legally required license notices and comments essential for third-party tools or build functionality.

The no-code-comments policy is a permanent project rule for all future code changes.
