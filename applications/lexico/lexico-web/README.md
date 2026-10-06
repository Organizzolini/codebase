# 🐺 Lexico

**A Latin–English dictionary, rebuilt.**

> ⚠️ **Work in progress.** The application shell, routing, and component
> library are real; the data layer is not yet wired up. Server functions in
> `src/lib/` are typed stubs returning empty results, so the UI renders but the
> dictionary does not yet answer.

Lexico is a server-side rendered web application built with TanStack Start and
React 19. It is the front end of a small suite: the dictionary's shape lives in
[lexico-entities](../../../packages/lexico-entities/README.md), the data that
fills it is gathered by
[lexico-cli](../lexico-cli/README.md), and the interface is built
from [components-web](../../../packages/components-web/README.md).

## Projects

| Project | Role |
| ------- | ---- |
| 🐺 [lexico-web](README.md) | The SSR web application — routes, server functions, pages |
| 🎨 [components-web](../../../packages/components-web/README.md) | Shared React component library on shadcn/ui and Radix primitives |
| 📖 [lexico-entities](../../../packages/lexico-entities/README.md) | TypeORM entities and migrations for the dictionary and literature schema |
| 🚰 [lexico-cli](../lexico-cli/README.md) | CLI that scrapes and loads dictionary, literature, and etymology sources |

## Quick Start

```bash
pnpm install
nx run lexico-web:develop     # http://localhost:3000
```

| Target | Does |
| ------ | ---- |
| `develop` | Vite dev server with hot reload |
| `build` | Production SSR bundle |
| `start` | Serve a built bundle |
| `preview` | Preview the production build locally |
| `codometer` | Measure the entry, route, CSS, and server bundles and gate the limit each declares |
| `vitest` | Tests — `:unit`, `:integration`, `:end-to-end` |
| `lint-code` | All static analysis; `--configuration=write` to auto-fix |

## Structure

```text
src/
├── routes/              # File-based routing (TanStack Router)
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # /
│   ├── search.tsx       # /search
│   ├── word.$id.tsx     # /word/:id
│   ├── bookmarks.tsx    # /bookmarks
│   ├── library.tsx      # /library
│   ├── settings.tsx     # /settings
│   └── tools.tsx        # /tools
├── lib/                 # Server functions and shared types
│   ├── auth.ts          # Current user, sign out
│   ├── search.ts        # Entry search and lookup
│   ├── bookmarks.ts     # Saved words
│   ├── library.ts       # Vocabulary tracking
│   ├── forms.ts         # Inflection tables
│   └── pronunciation.ts # Audio playback
├── components/          # Page-specific components
└── router.tsx           # Router construction
```

Routes are defined by file structure: `src/routes/search.tsx` serves `/search`,
and `src/routes/word.$id.tsx` serves `/word/:id`.

Data access goes through TanStack Start **server functions** — type-safe RPC
from client to server — declared in `src/lib/` and called from route loaders so
the first render is already populated. Wiring those handlers to a real
datastore is the outstanding work.

## Technology

- **React 19** with TanStack Router for file-based routing
- **TanStack Start** for SSR and server functions
- **Tailwind CSS** with shadcn/ui components from
  [components-web](../../../packages/components-web/README.md)
- **Vite 7** with Nitro for the SSR bundle
- **TypeScript 5.9**, strict mode throughout

## Documentation

- [AGENTS.md](AGENTS.md) — architecture and development patterns
- [Codebase AGENTS.md](../../../AGENTS.md) — workspace conventions and Nx workflows
- [TanStack Start](https://tanstack.com/router/latest/docs/framework/react/start/overview)

## License

MIT — see [LICENSE](../../../LICENSE).

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `applications/lexico/lexico-web`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 212 |
| Files | 37 |
| Calls traced | 129 |
| Call stacks | 24 |
| Deepest stack | 9 |
| Stacks through recursion | 0 |
| Unfollowable calls | 68 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 9 |
| `maximumBreadth` | 9 |

### Call stacks (depth)

**1. `SearchResultsList`** — depth 9 · orphan-root

```text
🚀 SearchResultsList(properties: SearchResultsListProperties): ReactNode [applications/lexico/lexico-web/src/routes/search.tsx:182]
   ↳ Search results list.
  └─> map(…)(entry: EntrySearchResult): JSX.Element [applications/lexico/lexico-web/src/routes/search.tsx:187]
    └─> transformForms(partOfSpeech: string, forms: Forms): TransformResult [applications/lexico/lexico-web/src/lib/forms.ts:100]
       ↳ Transform forms based on part of speech.
      └─> dispatchFormTransform(pos: string, forms: Forms): TransformResult [applications/lexico/lexico-web/src/lib/forms.ts:298]
         ↳ Dispatch form transformation by part-of-speech string, then fall back to type-guard auto-detection.
        └─> autoDetectFormTransform(forms: Forms): TransformResult [applications/lexico/lexico-web/src/lib/forms.ts:153]
           ↳ Auto-detect form type by structure inspection when part-of-speech does not match.
          └─> transformVerbForms(forms: VerbForms): VerbForm[] [applications/lexico/lexico-web/src/lib/forms.ts:140]
             ↳ Convert nested verb forms from database to flat array for VerbFormsTable.
            └─> transformIndicativeForms(forms: VerbForms): VerbForm[] [applications/lexico/lexico-web/src/lib/forms.ts:413]
               ↳ Extract indicative mood forms into flat VerbForm rows.
              └─> collectPersonNumberForms(…): void [applications/lexico/lexico-web/src/lib/forms.ts:244]
                 ↳ Collect finite verb forms from a number/person structure into result array.
                └─> personDisplay(person: string): string [applications/lexico/lexico-web/src/lib/forms.ts:365]
                   ↳ Helper to get person display string.
```

**2. `AdjectiveFormsTable`** — depth 8 · orphan-root

```text
🚀 AdjectiveFormsTable(properties: AdjectiveFormsTableProperties): null | React.ReactElement [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:73]
   ↳ Render adjective forms with degree and gender tab navigation.
  └─> useMemo(…)(): AdjectiveFormGroup[] [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:77]
    └─> groupAdjectiveForms(forms: AdjectiveForm[]): AdjectiveFormGroup[] [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:165]
       ↳ Group adjective forms by degree -\> gender for tabs.
      └─> buildDegreeGroupsFromForms(forms: AdjectiveForm[]): AdjectiveFormGroup[] [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:140]
         ↳ Build degree groups when the forms include degree data.
        └─> groupByGender(forms: AdjectiveForm[]): AdjectiveFormGroup["genders"] [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:175]
           ↳ Group forms by gender and restructure into cells.
          └─> restructureAdjectiveForms(forms: AdjectiveForm[]): FormCellProperties[] [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:236]
             ↳ Restructure adjective forms for a specific gender into cells.
            └─> flatMap(…)(this: undefined, caseName: string): [FormCellProperties, FormCellProperties] [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:252]
              └─> buildAdjectiveCaseRow(…): [FormCellProperties, FormCellProperties] [applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:120]
                 ↳ Build the singular + plural cell pair for one grammatical case.
```

**3. `WordForms`** — depth 8 · orphan-root

```text
🚀 WordForms(properties: WordFormsProperties): ReactNode [applications/lexico/lexico-web/src/routes/word.$id.tsx:56]
   ↳ Word forms.
  └─> transformForms(partOfSpeech: string, forms: Forms): TransformResult [applications/lexico/lexico-web/src/lib/forms.ts:100]
     ↳ Transform forms based on part of speech.
    └─> dispatchFormTransform(pos: string, forms: Forms): TransformResult [applications/lexico/lexico-web/src/lib/forms.ts:298]
       ↳ Dispatch form transformation by part-of-speech string, then fall back to type-guard auto-detection.
      └─> autoDetectFormTransform(forms: Forms): TransformResult [applications/lexico/lexico-web/src/lib/forms.ts:153]
         ↳ Auto-detect form type by structure inspection when part-of-speech does not match.
        └─> transformVerbForms(forms: VerbForms): VerbForm[] [applications/lexico/lexico-web/src/lib/forms.ts:140]
           ↳ Convert nested verb forms from database to flat array for VerbFormsTable.
          └─> transformIndicativeForms(forms: VerbForms): VerbForm[] [applications/lexico/lexico-web/src/lib/forms.ts:413]
             ↳ Extract indicative mood forms into flat VerbForm rows.
            └─> collectPersonNumberForms(…): void [applications/lexico/lexico-web/src/lib/forms.ts:244]
               ↳ Collect finite verb forms from a number/person structure into result array.
              └─> personDisplay(person: string): string [applications/lexico/lexico-web/src/lib/forms.ts:365]
                 ↳ Helper to get person display string.
```

<details>
<summary>21 more call stacks</summary>

**4. `VerbFormsTable`** — depth 7 · orphan-root

```text
🚀 VerbFormsTable(properties: VerbFormsTableProperties): null | React.ReactElement [applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:261]
   ↳ Render verb forms with mood, tense, and voice tab navigation.
  └─> useMemo(…)(): VerbFormGroup[] [applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:265]
    └─> groupVerbForms(forms: VerbForm[]): VerbFormGroup[] [applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:165]
       ↳ Group verb forms by mood -\> tense -\> voice for nested tabs.
      └─> buildVerbFormTenses(moodGroup: Record<string, Record<string, VerbForm[]>>): VerbFormGroup["tenses"] [applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:114]
         ↳ Convert a mood's nested tense/voice record into the ordered tenses array.
        └─> restructureVerbForms(forms: VerbForm[]): FormCellProperties[] [applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:239]
           ↳ Restructure verb forms for a specific mood/tense/voice into cells.
          └─> flatMap(…)(this: undefined, person: string): FormCellProperties[] [applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:253]
            └─> buildPersonCells(person: string, byPersonNumber: Record<string, string>): FormCellProperties[] [applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:87]
               ↳ Build the singular + plural cell pair for one grammatical person.
```

**5. `LibraryPage`** — depth ≥ 6 · orphan-root

```text
🚀 LibraryPage(): ReactNode [applications/lexico/lexico-web/src/routes/library.tsx:277]
   ↳ Library page component that displays and manages user's saved texts.
  └─> useLibraryPage(): LibraryPageState [applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:67]
     ↳ Hook managing the library page state and operations. Handles text CRUD operations, form state, and UI dialogs.
    └─> useCallback(…)(): Promise<void> [applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:95]
      └─> updateTextAsync(…): Promise<void> [applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:265]
         ↳ Updates the currently edited text and synchronizes the local sorted collection.
        └─> setTexts(…)(previous: UserText[]): UserText[] [applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:292]
          └─> map(…)(t: UserText): UserText [applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:293]
```

**6. `NounFormsTable`** — depth 5 · orphan-root

```text
🚀 NounFormsTable(properties: NounFormsTableProperties): React.ReactElement [applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:74]
   ↳ Render noun forms in a singular/plural table.
  └─> useMemo(…)(): FormCellProperties[] [applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:78]
    └─> restructureNounForms(forms: NounForm[]): FormCellProperties[] [applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:94]
       ↳ Restructure noun forms into a 2-column grid (singular, plural) Each row is a case, columns are singular and plural.
      └─> flatMap(…)(this: undefined, caseName: string): [FormCellProperties, FormCellProperties] [applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:108]
        └─> buildNounCaseRow(…): [FormCellProperties, FormCellProperties] [applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:54]
           ↳ Build the singular + plural cell pair for one grammatical case.
```

**7. `BookmarksPage`** — depth ≥ 4 · orphan-root

```text
🚀 BookmarksPage(): ReactNode [applications/lexico/lexico-web/src/routes/bookmarks.tsx:110]
   ↳ Bookmarks page component that displays user's bookmarked entries.
  └─> useCallback(…)(entryId: string): Promise<void> [applications/lexico/lexico-web/src/routes/bookmarks.tsx:137]
    └─> setBookmarks(…)(previous: BookmarkedEntry[]): BookmarkedEntry[] [applications/lexico/lexico-web/src/routes/bookmarks.tsx:141]
      └─> filter(…)(b: BookmarkedEntry): boolean [applications/lexico/lexico-web/src/routes/bookmarks.tsx:141]
```

**8. `SearchPage`** — depth ≥ 4 · orphan-root

```text
🚀 SearchPage(): ReactNode [applications/lexico/lexico-web/src/routes/search.tsx:75]
   ↳ Search page component that allows users to search for Latin entries.
  └─> useDebounce<T>(value: T, delay: number): T [applications/lexico/lexico-web/src/routes/search.tsx:220]
     ↳ Custom hook that debounces a value by the specified delay.
    └─> useEffect(…)(): () => void [applications/lexico/lexico-web/src/routes/search.tsx:223]
      └─> setTimeout(…)(): void [applications/lexico/lexico-web/src/routes/search.tsx:224]
```

**9. `FormCell`** — depth 3 · orphan-root

```text
🚀 FormCell(properties: FormCellProperties): React.ReactElement [applications/lexico/lexico-web/src/components/entry/form-cell.tsx:57]
   ↳ Render a single grid cell with optional corner identifiers.
  └─> computeBorderClasses(position: FormCellPosition | undefined): string [applications/lexico/lexico-web/src/components/entry/form-cell.tsx:43]
     ↳ Compute border classes for a form cell based on its grid position.
    └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**10. `PrincipalParts`** — depth 3 · orphan-root

```text
🚀 PrincipalParts(properties: PrincipalPartsProperties): ReactElement [applications/lexico/lexico-web/src/components/entry/principal-parts.tsx:125]
   ↳ Component that displays principal parts, part of speech, and inflection info.
  └─> getPrincipalPartsLabel(principalParts: PrincipalPart[] | Record<string, string | undefined>): string [applications/lexico/lexico-web/src/components/entry/principal-parts.tsx:194]
     ↳ Gets a formatted label from principal parts data.
    └─> map(…)(principalPart: PrincipalPart): string [applications/lexico/lexico-web/src/components/entry/principal-parts.tsx:199]
```

**11. `Translations`** — depth 3 · orphan-root

```text
🚀 Translations(properties: TranslationsProperties): ReactElement [applications/lexico/lexico-web/src/components/entry/translations.tsx:26]
   ↳ Renders translations inline, collapsing entries after the first two when expandable.
  └─> map(…)(t: string): ReactElement<unknown, string | JSXElementConstructor<any>> [applications/lexico/lexico-web/src/components/entry/translations.tsx:57]
    └─> renderTranslation(translation: string): ReactElement [applications/lexico/lexico-web/src/components/entry/translations.tsx:38]
```

**12. `PronunciationButton`** — depth ≥ 3 · orphan-root

```text
🚀 PronunciationButton(properties: Readonly<PronunciationButtonProperties>): ReactNode [applications/lexico/lexico-web/src/components/pronunciation-button.tsx:26]
   ↳ Plays the pronunciation of a word in the chosen dialect.
  └─> useCallback(…)(): Promise<void> [applications/lexico/lexico-web/src/components/pronunciation-button.tsx:37]
    └─> addEventListener(…)(): void [applications/lexico/lexico-web/src/components/pronunciation-button.tsx:56]
```

**13. `Logo`** — depth 2 · orphan-root

```text
🚀 Logo(properties: LogoProperties): React.ReactElement [applications/lexico/lexico-web/src/components/layout/logo.tsx:18]
   ↳ Render the Lexico brand logo at a configurable width.
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**14. `Identifier`** — depth 2 · orphan-root

```text
🚀 Identifier(properties: IdentifierProperties): ReactElement [applications/lexico/lexico-web/src/components/entry/identifier.tsx:171]
   ↳ Badge component that displays abbreviated identifiers with tooltips.
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**15. `FormTabs`** — depth 2 · orphan-root

```text
🚀 FormTabs(properties: FormTabsProperties): React.ReactElement [applications/lexico/lexico-web/src/components/entry/form-tabs.tsx:32]
   ↳ Render shared tab UI for selecting form groupings.
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**16. `FormsTable`** — depth 2 · orphan-root

```text
🚀 FormsTable(properties: FormsTableProperties): React.ReactElement [applications/lexico/lexico-web/src/components/entry/forms-table.tsx:27]
   ↳ Render two-column form cells with border-position metadata.
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**17. `ApplicationSidebar`** — depth 2 · orphan-root

```text
🚀 ApplicationSidebar(properties: Readonly<ApplicationSidebarProperties>): ReactNode [applications/lexico/lexico-web/src/routes/__root.tsx:112]
   ↳ Application sidebar component with navigation items.
  └─> useSidebar(): SidebarContextProperties [packages/components-web/src/components/ui/sidebar.tsx:46]
```

**18. `EntryCard`** — depth 2 · orphan-root

```text
🚀 EntryCard(properties: EntryCardProperties): ReactElement [applications/lexico/lexico-web/src/components/entry/entry-card.tsx:104]
   ↳ Renders a lexical entry card and wires accordion state for detail sections.
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**19. `BookmarksList`** — depth 2 · orphan-root

```text
🚀 BookmarksList(properties: BookmarksListProperties): ReactNode [applications/lexico/lexico-web/src/routes/bookmarks.tsx:88]
   ↳ Bookmarks list.
  └─> map(…)(entry: BookmarkedEntry): JSX.Element [applications/lexico/lexico-web/src/routes/bookmarks.tsx:92]
```

**20. `LibraryTextGrid`** — depth 2 · orphan-root

```text
🚀 LibraryTextGrid(…): ReactNode [applications/lexico/lexico-web/src/routes/library.tsx:455]
   ↳ Library text grid.
  └─> map(…)(text: UserText): JSX.Element [applications/lexico/lexico-web/src/routes/library.tsx:470]
```

**21. `anonymous`** — depth 2 · orphan-root

```text
🚀 anonymous(): undefined [applications/lexico/lexico-web/src/routes/settings.tsx:81]
  └─> handleSignIn(): Promise<void> [applications/lexico/lexico-web/src/routes/settings.tsx:29]
     ↳ Handle sign in.
```

**22. `anonymous`** — depth 2 · orphan-root

```text
🚀 anonymous(): undefined [applications/lexico/lexico-web/src/routes/settings.tsx:107]
  └─> handleSignOut(): Promise<void> [applications/lexico/lexico-web/src/routes/settings.tsx:52]
```

**23. `anonymous`** — depth 2 · orphan-root

```text
🚀 anonymous(): undefined [applications/lexico/lexico-web/src/routes/settings.tsx:144]
  └─> handleDeleteAccount(): Promise<void> [applications/lexico/lexico-web/src/routes/settings.tsx:57]
```

**24. `WordIdPage`** — depth ≥ 2 · orphan-root

```text
🚀 WordIdPage(): ReactNode [applications/lexico/lexico-web/src/routes/word.$id.tsx:85]
   ↳ Word detail page component that displays full entry information.
  └─> useEffect(…)(): void [applications/lexico/lexico-web/src/routes/word.$id.tsx:91]
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `dispatchFormTransform` | 9 | `isVerbForms`, `transformVerbForms`, `isNounPos`, `isNounForms`, `transformNounForms`, `isAdjectivePos`, `isAdjectiveForms`, `transformAdjectiveForms`, `autoDetectFormTransform` | `applications/lexico/lexico-web/src/lib/forms.ts:298` |
| `useLibraryPage` | 7 | `useLibraryPageStateInitialization`, `useCallback(…)`, `useEffect(…)`, `useCallback(…)`, `useCallback(…)`, `useCallback(…)`, `buildLibraryPageState` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:67` |
| `autoDetectFormTransform` | 6 | `isVerbForms`, `transformVerbForms`, `isAdjectiveForms`, `transformAdjectiveForms`, `isNounForms`, `transformNounForms` | `applications/lexico/lexico-web/src/lib/forms.ts:153` |

<details>
<summary>68 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `VerbFormsTable` | 5 | `useMemo(…)`, `map(…)`, `map(…)`, `map(…)`, `renderVerbFormContent` | `applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:261` |
| `transformVerbForms` | 5 | `transformIndicativeForms`, `transformSubjunctiveForms`, `transformImperativeForms`, `transformNonFiniteForms`, `transformVerbalNounForms` | `applications/lexico/lexico-web/src/lib/forms.ts:140` |
| `SearchPage` | 5 | `useDebounce`, `useEffect(…)`, `useEffect(…)`, `useCallback(…)`, `useEffect(…)` | `applications/lexico/lexico-web/src/routes/search.tsx:75` |
| `Translations` | 4 | `cn`, `map(…)`, `map(…)`, `map(…)` | `applications/lexico/lexico-web/src/components/entry/translations.tsx:26` |
| `FormTabs` | 3 | `cn`, `map(…)`, `map(…)` | `applications/lexico/lexico-web/src/components/entry/form-tabs.tsx:32` |
| `AdjectiveFormsTable` | 3 | `useMemo(…)`, `map(…)`, `renderAdjectiveGenderContent` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:73` |
| `groupAdjectiveForms` | 3 | `some(…)`, `groupByGender`, `buildDegreeGroupsFromForms` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:165` |
| `restructureVerbForms` | 3 | `some(…)`, `map(…)`, `flatMap(…)` | `applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:239` |
| `BookmarksPage` | 3 | `useCallback(…)`, `useEffect(…)`, `useCallback(…)` | `applications/lexico/lexico-web/src/routes/bookmarks.tsx:110` |
| `WordIdPage` | 3 | `useEffect(…)`, `useCallback(…)`, `map(…)` | `applications/lexico/lexico-web/src/routes/word.$id.tsx:85` |
| `FormCell` | 2 | `computeBorderClasses`, `cn` | `applications/lexico/lexico-web/src/components/entry/form-cell.tsx:57` |
| `FormsTable` | 2 | `cn`, `map(…)` | `applications/lexico/lexico-web/src/components/entry/forms-table.tsx:27` |
| `restructureAdjectiveForms` | 2 | `flatMap(…)`, `filter(…)` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:236` |
| `restructureNounForms` | 2 | `flatMap(…)`, `filter(…)` | `applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:94` |
| `groupVerbForms` | 2 | `buildVerbGroupRecord`, `buildVerbFormTenses` | `applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:165` |
| `transformNonFiniteForms` | 2 | `collectInfinitiveForms`, `collectParticipleForms` | `applications/lexico/lexico-web/src/lib/forms.ts:441` |
| `ApplicationSidebar` | 2 | `useSidebar`, `map(…)` | `applications/lexico/lexico-web/src/routes/__root.tsx:112` |
| `PrincipalParts` | 2 | `getPrincipalPartsLabel`, `cn` | `applications/lexico/lexico-web/src/components/entry/principal-parts.tsx:125` |
| `Logo` | 1 | `cn` | `applications/lexico/lexico-web/src/components/layout/logo.tsx:18` |
| `Identifier` | 1 | `cn` | `applications/lexico/lexico-web/src/components/entry/identifier.tsx:171` |
| `computeBorderClasses` | 1 | `cn` | `applications/lexico/lexico-web/src/components/entry/form-cell.tsx:43` |
| `useMemo(…)` | 1 | `groupAdjectiveForms` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:77` |
| `buildDegreeGroupsFromForms` | 1 | `groupByGender` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:140` |
| `groupByGender` | 1 | `restructureAdjectiveForms` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:175` |
| `renderAdjectiveGenderContent` | 1 | `map(…)` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:201` |
| `flatMap(…)` | 1 | `buildAdjectiveCaseRow` | `applications/lexico/lexico-web/src/components/entry/adjective-forms-table.tsx:252` |
| `NounFormsTable` | 1 | `useMemo(…)` | `applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:74` |
| `useMemo(…)` | 1 | `restructureNounForms` | `applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:78` |
| `flatMap(…)` | 1 | `buildNounCaseRow` | `applications/lexico/lexico-web/src/components/entry/noun-forms-table.tsx:108` |
| `buildVerbFormTenses` | 1 | `restructureVerbForms` | `applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:114` |
| `flatMap(…)` | 1 | `buildPersonCells` | `applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:253` |
| `useMemo(…)` | 1 | `groupVerbForms` | `applications/lexico/lexico-web/src/components/entry/verb-forms-table.tsx:265` |
| `transformForms` | 1 | `dispatchFormTransform` | `applications/lexico/lexico-web/src/lib/forms.ts:100` |
| `collectParticipleForms` | 1 | `collectParticipialTenseForms` | `applications/lexico/lexico-web/src/lib/forms.ts:218` |
| `collectPersonNumberForms` | 1 | `personDisplay` | `applications/lexico/lexico-web/src/lib/forms.ts:244` |
| `transformImperativeForms` | 1 | `collectPersonNumberForms` | `applications/lexico/lexico-web/src/lib/forms.ts:385` |
| `transformIndicativeForms` | 1 | `collectPersonNumberForms` | `applications/lexico/lexico-web/src/lib/forms.ts:413` |
| `transformSubjunctiveForms` | 1 | `collectPersonNumberForms` | `applications/lexico/lexico-web/src/lib/forms.ts:459` |
| `transformVerbalNounForms` | 1 | `collectVerbalNounCaseForms` | `applications/lexico/lexico-web/src/lib/forms.ts:487` |
| `getPrincipalPartsLabel` | 1 | `map(…)` | `applications/lexico/lexico-web/src/components/entry/principal-parts.tsx:194` |
| `map(…)` | 1 | `renderTranslation` | `applications/lexico/lexico-web/src/components/entry/translations.tsx:57` |
| `map(…)` | 1 | `renderTranslation` | `applications/lexico/lexico-web/src/components/entry/translations.tsx:66` |
| `map(…)` | 1 | `renderTranslation` | `applications/lexico/lexico-web/src/components/entry/translations.tsx:71` |
| `EntryCard` | 1 | `cn` | `applications/lexico/lexico-web/src/components/entry/entry-card.tsx:104` |
| `BookmarksList` | 1 | `map(…)` | `applications/lexico/lexico-web/src/routes/bookmarks.tsx:88` |
| `useCallback(…)` | 1 | `setBookmarks(…)` | `applications/lexico/lexico-web/src/routes/bookmarks.tsx:137` |
| `setBookmarks(…)` | 1 | `filter(…)` | `applications/lexico/lexico-web/src/routes/bookmarks.tsx:141` |
| `useCallback(…)` | 1 | `fetchTextsAsync` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:71` |
| `useCallback(…)` | 1 | `createTextAsync` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:81` |
| `useCallback(…)` | 1 | `updateTextAsync` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:95` |
| `useCallback(…)` | 1 | `deleteTextAsync` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:110` |
| `createTextAsync` | 1 | `setTexts(…)` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:173` |
| `deleteTextAsync` | 1 | `setTexts(…)` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:218` |
| `setTexts(…)` | 1 | `filter(…)` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:228` |
| `updateTextAsync` | 1 | `setTexts(…)` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:265` |
| `setTexts(…)` | 1 | `map(…)` | `applications/lexico/lexico-web/src/routes/hooks/useLibraryPage.ts:292` |
| `LibraryPage` | 1 | `useLibraryPage` | `applications/lexico/lexico-web/src/routes/library.tsx:277` |
| `LibraryTextGrid` | 1 | `map(…)` | `applications/lexico/lexico-web/src/routes/library.tsx:455` |
| `SearchResultsList` | 1 | `map(…)` | `applications/lexico/lexico-web/src/routes/search.tsx:182` |
| `map(…)` | 1 | `transformForms` | `applications/lexico/lexico-web/src/routes/search.tsx:187` |
| `useDebounce` | 1 | `useEffect(…)` | `applications/lexico/lexico-web/src/routes/search.tsx:220` |
| `useEffect(…)` | 1 | `setTimeout(…)` | `applications/lexico/lexico-web/src/routes/search.tsx:223` |
| `anonymous` | 1 | `handleSignIn` | `applications/lexico/lexico-web/src/routes/settings.tsx:81` |
| `anonymous` | 1 | `handleSignOut` | `applications/lexico/lexico-web/src/routes/settings.tsx:107` |
| `anonymous` | 1 | `handleDeleteAccount` | `applications/lexico/lexico-web/src/routes/settings.tsx:144` |
| `PronunciationButton` | 1 | `useCallback(…)` | `applications/lexico/lexico-web/src/components/pronunciation-button.tsx:26` |
| `useCallback(…)` | 1 | `addEventListener(…)` | `applications/lexico/lexico-web/src/components/pronunciation-button.tsx:37` |
| `WordForms` | 1 | `transformForms` | `applications/lexico/lexico-web/src/routes/word.$id.tsx:56` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  components_web["components-web"]
  lexico_web["lexico-web"]
  lexico_web --> components_web
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class lexico_web subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_components_entry_adjective_forms_table_tsx["src/components/entry/adjective-forms-table.tsx"]
  file_src_components_entry_entry_card_tsx["src/components/entry/entry-card.tsx"]
  file_src_components_entry_form_cell_tsx["src/components/entry/form-cell.tsx"]
  file_src_components_entry_form_tabs_tsx["src/components/entry/form-tabs.tsx"]
  file_src_components_entry_forms_table_tsx["src/components/entry/forms-table.tsx"]
  file_src_components_entry_identifier_tsx["src/components/entry/identifier.tsx"]
  file_src_components_entry_noun_forms_table_tsx["src/components/entry/noun-forms-table.tsx"]
  file_src_components_entry_principal_parts_tsx["src/components/entry/principal-parts.tsx"]
  file_src_components_entry_translations_tsx["src/components/entry/translations.tsx"]
  file_src_components_entry_verb_forms_table_tsx["src/components/entry/verb-forms-table.tsx"]
  file_src_components_layout_index_ts["src/components/layout/index.ts"]
  file_src_components_layout_logo_tsx["src/components/layout/logo.tsx"]
  file_src_components_pronunciation_button_tsx["src/components/pronunciation-button.tsx"]
  file_src_components_pronunciation_button_unit_test_tsx["src/components/pronunciation-button.unit.test.tsx"]
  file_src_lib_auth_ts["src/lib/auth.ts"]
  file_src_lib_bookmarks_ts["src/lib/bookmarks.ts"]
  file_src_lib_client_tsx["src/lib/client.tsx"]
  file_src_lib_forms_ts["src/lib/forms.ts"]
  file_src_lib_library_ts["src/lib/library.ts"]
  file_src_lib_pronunciation_ts["src/lib/pronunciation.ts"]
  file_src_lib_routeTree_gen_ts["src/lib/routeTree.gen.ts"]
  file_src_lib_search_ts["src/lib/search.ts"]
  file_src_lib_types_ts["src/lib/types.ts"]
  file_src_router_tsx["src/router.tsx"]
  file_src_routes___root_tsx["src/routes/__root.tsx"]
  file_src_routes_bookmarks_integration_test_tsx["src/routes/bookmarks.integration.test.tsx"]
  file_src_routes_bookmarks_tsx["src/routes/bookmarks.tsx"]
  file_src_routes_hooks_useLibraryPage_ts["src/routes/hooks/useLibraryPage.ts"]
  file_src_routes_index_integration_test_tsx["src/routes/index.integration.test.tsx"]
  file_src_routes_index_tsx["src/routes/index.tsx"]
  file_src_routes_library_integration_test_tsx["src/routes/library.integration.test.tsx"]
  file_src_routes_library_tsx["src/routes/library.tsx"]
  file_src_routes_search_integration_test_tsx["src/routes/search.integration.test.tsx"]
  file_src_routes_search_tsx["src/routes/search.tsx"]
  file_src_routes_settings_integration_test_tsx["src/routes/settings.integration.test.tsx"]
  file_src_routes_settings_tsx["src/routes/settings.tsx"]
  file_src_routes_tools_integration_test_tsx["src/routes/tools.integration.test.tsx"]
  file_src_routes_tools_tsx["src/routes/tools.tsx"]
  file_src_routes_word__id_integration_test_tsx["src/routes/word.$id.integration.test.tsx"]
  file_src_routes_word__id_tsx["src/routes/word.$id.tsx"]
  file_testing_render_route_tsx["testing/render-route.tsx"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_mts["vite.config.mts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_components_entry_adjective_forms_table_tsx --> file_src_components_entry_form_cell_tsx
  file_src_components_entry_adjective_forms_table_tsx --> file_src_components_entry_form_tabs_tsx
  file_src_components_entry_adjective_forms_table_tsx --> file_src_components_entry_forms_table_tsx
  file_src_components_entry_entry_card_tsx --> file_src_components_entry_adjective_forms_table_tsx
  file_src_components_entry_entry_card_tsx --> file_src_components_entry_noun_forms_table_tsx
  file_src_components_entry_entry_card_tsx --> file_src_components_entry_principal_parts_tsx
  file_src_components_entry_entry_card_tsx --> file_src_components_entry_translations_tsx
  file_src_components_entry_entry_card_tsx --> file_src_components_entry_verb_forms_table_tsx
  file_src_components_entry_entry_card_tsx --> file_src_lib_types_ts
  file_src_components_entry_form_cell_tsx --> file_src_components_entry_identifier_tsx
  file_src_components_entry_form_tabs_tsx --> file_src_components_entry_identifier_tsx
  file_src_components_entry_forms_table_tsx --> file_src_components_entry_form_cell_tsx
  file_src_components_entry_noun_forms_table_tsx --> file_src_components_entry_form_cell_tsx
  file_src_components_entry_noun_forms_table_tsx --> file_src_components_entry_forms_table_tsx
  file_src_components_entry_principal_parts_tsx --> file_src_components_entry_identifier_tsx
  file_src_components_entry_principal_parts_tsx --> file_src_lib_types_ts
  file_src_components_entry_verb_forms_table_tsx --> file_src_components_entry_form_cell_tsx
  file_src_components_entry_verb_forms_table_tsx --> file_src_components_entry_form_tabs_tsx
  file_src_components_entry_verb_forms_table_tsx --> file_src_components_entry_forms_table_tsx
  file_src_components_pronunciation_button_tsx --> file_src_lib_pronunciation_ts
  file_src_components_pronunciation_button_unit_test_tsx --> file_src_components_pronunciation_button_tsx
  file_src_lib_bookmarks_ts --> file_src_lib_types_ts
  file_src_lib_forms_ts --> file_src_components_entry_adjective_forms_table_tsx
  file_src_lib_forms_ts --> file_src_components_entry_noun_forms_table_tsx
  file_src_lib_forms_ts --> file_src_components_entry_verb_forms_table_tsx
  file_src_lib_forms_ts --> file_src_lib_types_ts
  file_src_lib_routeTree_gen_ts --> file_src_router_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes___root_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes_bookmarks_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes_index_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes_library_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes_search_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes_settings_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes_tools_tsx
  file_src_lib_routeTree_gen_ts --> file_src_routes_word__id_tsx
  file_src_lib_search_ts --> file_src_lib_types_ts
  file_src_router_tsx --> file_src_lib_routeTree_gen_ts
  file_src_routes___root_tsx --> file_src_components_layout_index_ts
  file_src_routes___root_tsx --> file_src_lib_auth_ts
  file_src_routes_bookmarks_integration_test_tsx --> file_src_routes_bookmarks_tsx
  file_src_routes_bookmarks_integration_test_tsx --> file_testing_render_route_tsx
  file_src_routes_bookmarks_tsx --> file_src_components_entry_entry_card_tsx
  file_src_routes_bookmarks_tsx --> file_src_lib_bookmarks_ts
  file_src_routes_hooks_useLibraryPage_ts --> file_src_lib_library_ts
  file_src_routes_index_integration_test_tsx --> file_src_routes_index_tsx
  file_src_routes_index_integration_test_tsx --> file_testing_render_route_tsx
  file_src_routes_library_integration_test_tsx --> file_src_routes_library_tsx
  file_src_routes_library_integration_test_tsx --> file_testing_render_route_tsx
  file_src_routes_library_tsx --> file_src_lib_library_ts
  file_src_routes_library_tsx --> file_src_routes_hooks_useLibraryPage_ts
  file_src_routes_search_integration_test_tsx --> file_src_routes_search_tsx
  file_src_routes_search_integration_test_tsx --> file_testing_render_route_tsx
  file_src_routes_search_tsx --> file_src_components_entry_entry_card_tsx
  file_src_routes_search_tsx --> file_src_lib_forms_ts
  file_src_routes_search_tsx --> file_src_lib_search_ts
  file_src_routes_search_tsx --> file_src_lib_types_ts
  file_src_routes_settings_integration_test_tsx --> file_src_routes_settings_tsx
  file_src_routes_settings_integration_test_tsx --> file_testing_render_route_tsx
  file_src_routes_settings_tsx --> file_src_lib_auth_ts
  file_src_routes_tools_integration_test_tsx --> file_src_routes_tools_tsx
  file_src_routes_tools_integration_test_tsx --> file_testing_render_route_tsx
  file_src_routes_word__id_integration_test_tsx --> file_src_routes_word__id_tsx
  file_src_routes_word__id_integration_test_tsx --> file_testing_render_route_tsx
  file_src_routes_word__id_tsx --> file_src_components_entry_adjective_forms_table_tsx
  file_src_routes_word__id_tsx --> file_src_components_entry_noun_forms_table_tsx
  file_src_routes_word__id_tsx --> file_src_components_entry_principal_parts_tsx
  file_src_routes_word__id_tsx --> file_src_components_entry_verb_forms_table_tsx
  file_src_routes_word__id_tsx --> file_src_components_pronunciation_button_tsx
  file_src_routes_word__id_tsx --> file_src_lib_bookmarks_ts
  file_src_routes_word__id_tsx --> file_src_lib_forms_ts
  file_src_routes_word__id_tsx --> file_src_lib_search_ts
  file_src_routes_word__id_tsx --> file_src_lib_types_ts
  file_testing_render_route_tsx --> file_src_router_tsx
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-5480-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-166.06_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-9-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-41-3178c6?style=flat-square)

### Measured Targets

![Client entry JavaScript Size](https://img.shields.io/badge/Client_entry_JavaScript_Size-143.05_kB_gzip-6b7280?style=flat-square)
![Client route JavaScript Size](https://img.shields.io/badge/Client_route_JavaScript_Size-83.13_kB_gzip-6b7280?style=flat-square)
![Client CSS Size](https://img.shields.io/badge/Client_CSS_Size-15.45_kB_gzip-6b7280?style=flat-square)
![Server JavaScript Size](https://img.shields.io/badge/Server_JavaScript_Size-165.76_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-39-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-79-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-3-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-0-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-279-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-2-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-1-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-18-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-0-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-221-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-0-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-186-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-35-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-289-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-157-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-82-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-416-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-655-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-3-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-160-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-36-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-12-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-108-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-87-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-33-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-144-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-5-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-0-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-0-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-0-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-0-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-0-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-71-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-6-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-4-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-15-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-3-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-7-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-0-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-0-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-10-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-4-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-5-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
