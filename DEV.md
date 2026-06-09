# Atomic Bomb Development

## Testing

Run the test suite:

```shell
npm test
```

Run the test suite without npm scripts:

```shell
node --test _tests_/*.test.js
```

Check syntax directly:

```shell
find src _tests_ -maxdepth 1 -name '*.js' -print | sort | xargs -n1 node --check
```

## Formatting

Format files:

```shell
npm run nice
```

## Publishing

Before publishing:

```shell
npm whoami
npm test
npm pack --dry-run
```

Publish:

```shell
npm publish
```

If publishing from GitHub Actions, make sure the publish workflow trigger
matches the release flow. A job guarded by:

```yaml
if: github.event.pull_request.merged == true
```

will be skipped on normal `push` or tag events because
`github.event.pull_request` is not present for those events.
