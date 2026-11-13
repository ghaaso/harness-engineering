<!-- Trimmed from https://github.com/urbandroid-team/dont-kill-my-app @ 3616bc8b3b6b3910ac204e107ff0dfd6064f877c _vendors-content/xiaomi/{explanation,dev,user}.md (CC-BY-4.0; content by www.dontkillmyapp.com / Urbandroid Team; licence ../../LICENSE-urbandroid-dont-kill-my-app): kept explanation, the dev "tested on devices" note, user sections App pinning, Autostart permission, Boost speed, MIUI Optimizations, Power management, App battery saver, Autostart; removed images, the MIUI 12/11/10 screenshot-only sections, the third-party autostart-checker link and "Hidden settings" (third-party apps); figure captions kept as plain lines -->
# Xiaomi (MIUI) — from www.dontkillmyapp.com / Urbandroid Team

Upstream page front matter: name Xiaomi, subtitle "except Android One", award 5
(`_vendors/xiaomi.md`). **No HyperOS content exists upstream** (grep "HyperOS" over `_vendors*`,
2026-11-04); MIUI 14 is the newest version named. HyperOS phones in the fleet are unknown territory.

## explanation.md

Traditionally, Xiaomi and their Android customization called _MIUI_ belongs in the most troubled group on the market with respect to non-standard background process limitations and non-standard permissions.
There are no APIs and no documentation for those extensions. In default settings, background processing simply does not work right and apps using them will break.

> **Note**: Android One devices by Xiaomi work much better than MIUI-based devices. So, if you like Xiaomi, we definitely recommend looking for their Android One offering.

## dev.md (upstream's tested-device list for the third-party XomaDev/MIUI-autostart checker, which is not vendored; it verifies that library only, not any settings path below)

### Check Autostart permission

This has been tested on devices:

    - MIUI 10 (firebase)
    - MIUI 11 (physical device 11.0.9)
    - MIUI 12 (physical device 12.5)
    - MIUI 13 (untested, but work)
    - MIUI 14 (physical device 14.0.2)

## user.md

### App pinning / App locking

When you open the recent apps tray, drag your app downwards (it will be locked). Locked/pinned apps will gain further protection and not be cleared from the background, even if you clear recent apps. Drag downwards again to clear your app from the background. <br>
On some phones, you need to long-press Your app and then choose the padlock icon from the menu:

Another method of app locking is hidden a little deeper:

Open Security app → Boost speed
Open the Settings cog icon
Go to Lock apps and pick your app

### Autostart permission

On MIUI 14, there is a new permission to start from the background for each app, in *Settings > Apps > Your app > App permissions > Background autostart*.

### Boost speed

If the app is locked here in this "Boost speed" feature, it may be spared by *Ultra battery saver*.

### MIUI Optimizations

MIUI Optimizations were reported on MIUI 12 so far, but this option may be present on older versions too (let us know, if you have found this option on your phone). It is hidden in the Developers settings, so you need to switch to developer mode first (10x tap on MIUI version in About phone). As with all "optimizations", the MIUI optimizations can break the background tasks.

### Power management

Please enable:

* *Settings > Advanced Settings > Battery manager > Power plan* is set to Performance

* *Device Settings > Advanced Settings > Battery Manager > Protected apps* – your app needs to be Protected

* *Device Settings > Apps > your app > Battery > Power-intensive prompt* and *Keep running after screen off*

* *Settings > Additional Settings > Battery & Performance > Manage apps’ battery usage* and here:

1. Switch Power Saving Modes to Off

2. Choose the next options: *Saving Power in The Background > Choose apps > select your app > Background Settings > No restrictions*

### App battery saver

*Security > Battery > App Battery Saver > your app > No restriction*

### Autostart

(according to [Xiaomi](https://in.c.mi.com/thread-253478-1-0.html):

Open *Security app > Permissions > Auto-start*

Enable "Autostart" for desired apps.

Search for Your app and tap to enable
