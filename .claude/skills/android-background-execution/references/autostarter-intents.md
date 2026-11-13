<!-- Trimmed from https://github.com/judemanutd/AutoStarter @ ea5fca55457facb6f97555e20dcd231b39c6995e autostarter/src/main/java/com/judemanutd/autostarter/AutoStartPermissionHelper.kt and autostarter/src/main/AndroidManifest.xml (MIT, Copyright (c) 2018 Jude Fernandes; licence text in ../LICENSE-judemanutd-autostarter): kept the fleet-OEM constants (Xiaomi/Poco/Redmi, Oppo, Vivo), the Build.BRAND dispatch, the three fleet-OEM intent lists, the lookup helpers, and the manifest <queries> block; code is verbatim, original line numbers in each block heading -->
# OEM autostart intent components (AutoStarter 1.1.0)

**Status of these names: verified in code only.** The upstream carries no tested-device list and
no "verified against" note (README.md:21 — "there is no documented api for bringing up the
autostart permission manager of a phone"). Plan §0 standing rule 2: a component that resolves on
a fleet phone is device evidence; this file is not. Gaps a FixFlow implementation must handle:

- **No `realme`, `tecno`, `infinix`, `itel` or `hyperos` entry anywhere** (grep -i over the file,
  2026-11-04). `Build.BRAND` `realme` or `tecno` falls to `else -> return false` (lines 169-171).
- **Oppo component differs between the two upstreams**: DontKillMyApp
  `_vendors-content/oppo/user.md:14` names `com.coloros.safecenter / com.coloros.safecenter.permission.Permission`;
  this file names `com.coloros.safecenter.permission.startup.StartupAppListActivity` (line 65-66) and two
  fallbacks. Neither has been resolved on a fleet phone.
- Package lookup (`isPackageExists`, `getInstalledApplications`) needs package visibility on
  targetSdk 30+; the library declares a `<queries>` block (manifest lines 9-33) and leaves
  `QUERY_ALL_PACKAGES` commented out (lines 5-7). In FixFlow any manifest addition is an `app.json`
  / config-plugin change that needs the EAS compile gate (CLAUDE.md:86-87).
- How FixFlow would fire one of these components from JS (`expo-intent-launcher` 12.0.2,
  `technician-app/package.json:29`, with a package + class name) is not verified here: the module's
  source is not in the cache (INFERRED; open question).

## Constants (lines 15-23, 59-83)

```kotlin
    /***
     * Xiaomi
     */
    private val BRAND_XIAOMI = "xiaomi"
    private val BRAND_XIAOMI_POCO = "poco"
    private val BRAND_XIAOMI_REDMI = "redmi"
    private val PACKAGE_XIAOMI_MAIN = "com.miui.securitycenter"
    private val PACKAGE_XIAOMI_COMPONENT =
        "com.miui.permcenter.autostart.AutoStartManagementActivity"
```

```kotlin
    /**
     * Oppo
     */
    private val BRAND_OPPO = "oppo"
    private val PACKAGE_OPPO_MAIN = "com.coloros.safecenter"
    private val PACKAGE_OPPO_FALLBACK = "com.oppo.safe"
    private val PACKAGE_OPPO_COMPONENT =
        "com.coloros.safecenter.permission.startup.StartupAppListActivity"
    private val PACKAGE_OPPO_COMPONENT_FALLBACK =
        "com.oppo.safe.permission.startup.StartupAppListActivity"
    private val PACKAGE_OPPO_COMPONENT_FALLBACK_A =
        "com.coloros.safecenter.startupapp.StartupAppListActivity"

    /**
     * Vivo
     */

    private val BRAND_VIVO = "vivo"
    private val PACKAGE_VIVO_MAIN = "com.iqoo.secure"
    private val PACKAGE_VIVO_FALLBACK = "com.vivo.permissionmanager"
    private val PACKAGE_VIVO_COMPONENT = "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
    private val PACKAGE_VIVO_COMPONENT_FALLBACK =
        "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
    private val PACKAGE_VIVO_COMPONENT_FALLBACK_A =
        "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"
```

Omitted brands (constants at the cited lines, not fleet OEMs per `technician-app/src/features/onboarding/battery.ts:4`):
Letv 28-30, Asus 35-39, Honor 44-47, Huawei 52-57, Nokia 89-92, Samsung 97-102, OnePlus 107-111.

## Brand dispatch (lines 137-173)

```kotlin
    fun getAutoStartPermission(
        context: Context,
        open: Boolean = true,
        newTask: Boolean = false
    ): Boolean {

        when (Build.BRAND.lowercase(Locale.ROOT)) {

            BRAND_ASUS -> return autoStartAsus(context, open, newTask)

            BRAND_XIAOMI, BRAND_XIAOMI_POCO, BRAND_XIAOMI_REDMI -> return autoStartXiaomi(
                context,
                open,
                newTask
            )

            BRAND_LETV -> return autoStartLetv(context, open, newTask)

            BRAND_HONOR -> return autoStartHonor(context, open, newTask)

            BRAND_HUAWEI -> return autoStartHuawei(context, open, newTask)

            BRAND_OPPO -> return autoStartOppo(context, open, newTask)

            BRAND_VIVO -> return autoStartVivo(context, open, newTask)

            BRAND_NOKIA -> return autoStartNokia(context, open, newTask)

            BRAND_SAMSUNG -> return autoStartSamsung(context, open, newTask)

            BRAND_ONE_PLUS -> return autoStartOnePlus(context, open, newTask)

            else -> {
                return false
            }
        }
    }
```

## Fleet-OEM intent lists (lines 199-206, 250-293)

```kotlin
    private fun autoStartXiaomi(context: Context, open: Boolean, newTask: Boolean): Boolean {
        return autoStart(
            context,
            listOf(PACKAGE_XIAOMI_MAIN),
            listOf(getIntent(PACKAGE_XIAOMI_MAIN, PACKAGE_XIAOMI_COMPONENT, newTask)),
            open
        )
    }
```

```kotlin
    private fun autoStartOppo(context: Context, open: Boolean, newTask: Boolean): Boolean {
        return if (autoStart(
                context,
                listOf(PACKAGE_OPPO_MAIN, PACKAGE_OPPO_FALLBACK),
                listOf(
                    getIntent(PACKAGE_OPPO_MAIN, PACKAGE_OPPO_COMPONENT, newTask),
                    getIntent(PACKAGE_OPPO_FALLBACK, PACKAGE_OPPO_COMPONENT_FALLBACK, newTask),
                    getIntent(PACKAGE_OPPO_MAIN, PACKAGE_OPPO_COMPONENT_FALLBACK_A, newTask)
                ),
                open
            )
        ) true
        else launchOppoAppInfo(context, open, newTask)
    }

    private fun launchOppoAppInfo(context: Context, open: Boolean, newTask: Boolean): Boolean {
        return try {
            val i = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            i.addCategory(Intent.CATEGORY_DEFAULT)
            i.data = Uri.parse("package:${context.packageName}")
            if (open) {
                context.startActivity(i)
                true
            } else {
                isActivityFound(context, i)
            }
        } catch (exx: Exception) {
            exx.printStackTrace()
            false
        }
    }

    private fun autoStartVivo(context: Context, open: Boolean, newTask: Boolean): Boolean {
        return autoStart(
            context,
            listOf(PACKAGE_VIVO_MAIN, PACKAGE_VIVO_FALLBACK),
            listOf(
                getIntent(PACKAGE_VIVO_MAIN, PACKAGE_VIVO_COMPONENT, newTask),
                getIntent(PACKAGE_VIVO_FALLBACK, PACKAGE_VIVO_COMPONENT_FALLBACK, newTask),
                getIntent(PACKAGE_VIVO_MAIN, PACKAGE_VIVO_COMPONENT_FALLBACK_A, newTask)
            ),
            open
        )
    }
```

## Lookup helpers (lines 340-350, 369-374, 398-402, 425-433, 445-455)

```kotlin
    private fun isPackageExists(context: Context, targetPackage: String): Boolean {
        val packages: List<ApplicationInfo>
        val pm = context.packageManager
        packages = pm.getInstalledApplications(0)
        for (packageInfo in packages) {
            if (packageInfo.packageName == targetPackage) {
                return true
            }
        }
        return false
    }
```

```kotlin
    private fun getIntent(packageName: String, componentName: String, newTask: Boolean): Intent {
        return Intent().apply {
            component = ComponentName(packageName, componentName)
            if (newTask) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }
```

```kotlin
    private fun isActivityFound(context: Context, intent: Intent): Boolean {
        return context.packageManager.queryIntentActivities(
            intent, PackageManager.MATCH_DEFAULT_ONLY
        ).isNotEmpty()
    }
```

```kotlin
    private fun openAutoStartScreen(context: Context, intents: List<Intent>): Boolean {
        intents.forEach {
            if (isActivityFound(context, it)) {
                startIntent(context, it)
                return@openAutoStartScreen true
            }
        }
        return false
    }
```

```kotlin
    private fun autoStart(
        context: Context,
        packages: List<String>,
        intents: List<Intent>,
        open: Boolean
    ): Boolean {
        return if (packages.any { isPackageExists(context, it) }) {
            if (open) openAutoStartScreen(context, intents)
            else areActivitiesFound(context, intents)
        } else false
    }
```

## Manifest `<queries>` (autostarter/src/main/AndroidManifest.xml lines 5-11, 19-24, 32-33)

```xml
    <!--<uses-permission
        android:name="android.permission.QUERY_ALL_PACKAGES"
        tools:ignore="QueryAllPackagesPermission" />-->

    <queries>
        <package android:name="com.miui.securitycenter" />
        <package android:name="com.miui.permcenter" />
        <package android:name="com.coloros.safecenter" />
        <package android:name="com.oppo.safe" />

        <package android:name="com.iqoo.secure" />

        <package android:name="com.vivo.permissionmanager" />
        <package android:name="com.android.settings" />
    </queries>
```
(Non-fleet `<package>` lines 13, 15, 17, 26, 28, 30 omitted.)
