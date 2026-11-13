<!-- Trimmed from https://github.com/expo/skills @ a9e5bd3fa00b4e61f632e43f85da73aee1942582 plugins/expo/skills/eas-app-stores/SKILL.md (MIT): kept sections "Version Management" and "Monitoring" (with the upstream's "verified with EAS CLI 23.2.0" and "tested 18.6.0" notes); dropped every other section (store submission, iOS, hosting, workflows, quick start with unpinned eas-cli). Text below is verbatim, except that one sentence of :167 pointing to the iOS-only `references/testflight.md` (rejected, not vendored) is dropped. -->
<!-- FixFlow: `eas build:version:set` writes EAS project state and is an [owner] step; the submit commands are iOS / Play only and FixFlow submits nowhere. See SKILL.md. -->

## Version Management

EAS manages version numbers automatically with `appVersionSource: "remote"`:

```bash
# Check current versions
eas build:version:get

# Manually set version
eas build:version:set -p ios
```

The version-set command prompts for the value. When setting up or changing native iOS versioning, or diagnosing a duplicate build number, inspect the archived `CFBundleVersion`: the remote counter alone does not prove that Xcode used it.

## Monitoring

```bash
# List recent builds
eas build:list

# Check build status
eas build:view BUILD_ID

# Inspect submissions (verified with EAS CLI 23.2.0)
eas submit:list -p ios --json
eas submit:view SUBMISSION_ID --json
```

Check the CLI version before interpreting a missing command: these submission commands are available in 23.2.0 but not in the tested 18.6.0 installation. A pinned `npx eas-cli@23.2.0` invocation can use them without changing the global installation. Follow the returned log URLs when the JSON result omits the underlying failure. Report the exact build ID/version and the furthest verified release state.
