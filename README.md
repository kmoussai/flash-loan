# Flash-Loan Website

A modern, responsive website for Flash-Loan, a reliable provider of micro-loans and personal loans in Canada.

## 🚀 Features

- **Multi-language Support**: English and French with `next-intl`
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Modern UI**: Built with Next.js 14 App Router and Tailwind CSS
- **Multiple Themes**: 8+ theme options (light, dark, Instagram, Discord, etc.)
- **Type-Safe**: Full TypeScript support
- **SEO Optimized**: Server-side rendering with Next.js
- **Professional Design**: Clean, trustworthy interface following brand guidelines

## 📋 Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

## 🛠️ Getting Started

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

The app will automatically:
- Clean `.next` cache before starting (via `predev` script)
- Reload when you edit files
- Show lint errors in the console

### Build for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## 📁 Project Structure

```
/src/app/[locale]/          # Locale-based routing
├── components/             # Shared components
│   ├── Button.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ThemeProvider.tsx
│   └── LangSwitcher.tsx
├── about/                  # About page
├── apply/                  # Apply page (Coming Soon)
├── contact/                # Contact page
├── how-it-works/          # How it works page
├── repayment/             # Repayment page
├── page.tsx               # Homepage
├── layout.tsx             # Locale layout
└── globals.css            # Global styles + theme variables

/messages/                  # i18n translations
├── en.json                # English
└── fr.json                # French

/src/
├── navigation.ts          # Internationalized routing
├── i18n.ts               # i18n configuration
└── middleware.ts         # Next.js middleware
```

## 📄 Pages

| Route | Description | Status |
|-------|-------------|--------|
| `/` | Main landing page with loan information | ✅ Live |
| `/about` | Company information and mission | ✅ Live |
| `/how-it-works` | Loan process explanation | ✅ Live |
| `/repayment` | Repayment options and schedules | ✅ Live |
| `/contact` | Contact information and form | ✅ Live |
| `/apply` | Loan application portal | 🚧 Coming Soon |

All pages are available in English (`/en/...`) and French (`/fr/...`).

## 🔧 Technologies Used

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 14.1.0 |
| UI Library | React | 18.2.0 |
| Language | TypeScript | 5.3.3 |
| Styling | Tailwind CSS | 3.4.1 |
| i18n | next-intl | 3.11.3 |
| Themes | next-themes | 0.2.1 |
| UI Components | Radix UI | Various |
| Icons | React Icons | 5.1.0 |

## 🎨 Available Themes

- `light` - Default light theme
- `dark` - Dark mode
- `instagram` - Instagram-inspired colors
- `facebook` - Facebook-inspired colors
- `discord` - Discord-inspired colors
- `netflix` - Netflix-inspired colors
- `twilight` - Soft purple theme
- `reddit` - Reddit-inspired colors

## 🌍 Internationalization

The app supports English and French. Translations are managed in:
- `/messages/en.json` - English translations
- `/messages/fr.json` - French translations

### Adding New Translations

1. Add key to `/messages/en.json`
2. Add same key to `/messages/fr.json`
3. Use in components: `{t('Your_Translation_Key')}`

Translation keys use `Underscore_Case` format.

## 🔗 Adding New Routes

1. Create page in `/src/app/[locale]/your-route/page.tsx`
2. Add `'use client'` directive if using client features
3. Register route in `/src/navigation.ts`:
   ```typescript
   export const pathnames = {
     // ... existing routes
     '/your-route': '/your-route'
   }
   ```
4. Add translations to both language files
5. Update `Header.tsx` navigation if needed

## 💡 Development Guidelines

### Important Notes

⚠️ **Always use `'use client'` directive** for pages that:
- Use the `Link` component from `@/src/navigation`
- Use `useTranslations` hook
- Have any client-side interactivity

⚠️ **Always use custom Link** from `@/src/navigation`, NOT `next/link`

⚠️ **Register all routes** in `/src/navigation.ts` before using them

### Code Style

- Components: PascalCase (`Button.tsx`)
- Routes: kebab-case (`how-it-works/`)
- Translation keys: Underscore_Case (`Apply_Now`)
- Follow existing patterns for consistency

### Common Patterns

See `.cursorrules` for detailed code patterns and examples.

## 🎯 Brand Guidelines

- **Primary Color**: #333366 (Dark Blue)
- **Secondary Color**: #097fa5 (Teal)
- **Target Audience**: Canadian borrowers
- **Key Values**: Transparency, Speed, Accessibility
- **Tone**: Professional, Trustworthy, Supportive

## 📞 Contact Information

- **Phone**: +1 (450) 235-8461
- **Email**: contact@flash-loan.ca
- **Address**: 5400 Rue Jean-Talon O, Unit #806, Montréal, QC, H4P 2T5
- **Website**: [flash-loan.ca](https://flash-loan.ca)

## 📝 License

Private - Flash-Loan Inc.

## 🤝 Support

For detailed development context and guidelines, see [`.cursorrules`](./.cursorrules).

---

**Built with ❤️ for Flash-Loan**