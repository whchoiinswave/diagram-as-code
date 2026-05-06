# Diagram as Code

Interactive Mermaid diagram editor with source editing, preview selection, edge editing, and workspace support.

## Commands

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Build

The production build is generated in `dist/`.

```sh
npm run build
```

## Installable Tarball

Create an npm-installable tarball in `dist/`.

```sh
npm run pack:dist
npm install -g ./dist/diagram-as-code-0.1.0-dist.tgz
diagram-as-code --port 4173
```
