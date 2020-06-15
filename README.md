# eslint-formatter-lsif

[![npm](https://img.shields.io/npm/v/eslint-formatter-lsif.svg)](https://www.npmjs.com/package/eslint-formatter-lsif)
[![downloads](https://img.shields.io/npm/dt/eslint-formatter-lsif.svg)](https://www.npmjs.com/package/eslint-formatter-lsif)
[![build](https://travis-ci.org/sourcegraph/eslint-formatter-lsif.svg?branch=master)](https://travis-ci.org/sourcegraph/eslint-formatter-lsif)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

[LSIF](https://github.com/microsoft/language-server-protocol/blob/master/indexFormat/specification.md) exporter for ESLint.
Outputs diagnostics.

## Install

```
npm install --save-dev eslint-formatter-lsif
# or
yarn add --dev eslint-formatter-lsif
```

## Usage

```
eslint 'src/**/*.ts' -f lsif -o dump.lsif
```

## Build

```
yarn
yarn build
```

## Release

Releases are done automatically in CI when commits are merged into master by analyzing [Conventional Commit Messages](https://conventionalcommits.org/).
After running `yarn`, commit messages will be linted automatically when committing though a git hook.
The git hook can be circumvented for fixup commits with [git's `fixup!` autosquash feature](https://fle.github.io/git-tip-keep-your-branch-clean-with-fixup-and-autosquash.html), or by passing `--no-verify` to `git commit`.
You may have to rebase a branch before merging to ensure it has a proper commit history, or squash merge with a manually edited commit message that conforms to the convention.
