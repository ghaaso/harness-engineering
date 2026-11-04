<!-- Trimmed from https://github.com/urbandroid-team/dont-kill-my-app @ 3616bc8b3b6b3910ac204e107ff0dfd6064f877c _vendors-content/vivo/{explanation,dev,user}.md (CC-BY-4.0; content by www.dontkillmyapp.com / Urbandroid Team; licence ../../LICENSE-urbandroid-dont-kill-my-app): kept all sections (Autostart, Unrestricted battery usage, Background power usage restrictions, Lock the app, high power consumption, Battery optimization); removed images; figure captions kept as plain lines -->
# Vivo (Funtouch OS) — from www.dontkillmyapp.com / Urbandroid Team

Upstream front matter: name Vivo, award 3 (`_vendors/vivo.md`). Version notes upstream: "As
reported from the Android 13 version" (user.md:16), "Also reported from Android 13" (user.md:28).

## explanation.md

System restrictions on Vivo phones have not been fully uncovered yet. If you have any additional information, please let us know.<br>
The apps loading from the background need a special permission for <strong>Autostart</strong>.

## dev.md

No known solution on dev end yet.

## user.md

## Autostart

Based on the information by Vivo, this option should be present on all Vivo phones.<br>
Newer OS version: *Settings > More settings > Applications > Autostart* to turn on/off the app switch.<br>
For Funtouch OS 2.6 and lower version: *i Manager > App manager > Autostart manager* to turn on/off the app switch.

## Unrestricted battery usage

As reported from the Android 13 version; you can set a non-restricted battery usage for each app individually.

System settings → the app of your choice → Battery

## Background power usage restrictions

Also reported from Android 13, can be set up for each app in the Battery section.

Setting  → Battery  → Background power consumption management

## Lock the app

### Lock the app in the taskbar
Apps locked in the taskbar are safe from getting terminated when they run in the background.
<br>
1. Swipe up in your home screen while the app is open in the background, and swipe the app icon <strong>down</strong>.
<br>
2. Tap the lock icon.
<br>
3. Done - now the app is locked in the taskbar.

### Lock the app in the Recent Apps

Locking the app in the Recent Apps screen can look slightly different on each version of Android - in the Recent Apps screen, find the app you wish to lock, tap its sub-menu, and find the "lock" / "lockdown" option

1. Choose "Lockdown" in the top right submenu.
2. App is now locked

## Allow the app to keep running even during high power consumption

1. Go to system Settings > Battery.
<br>
2. Go to High background power consumption.
<br>
3. Find your app in the list and enable the high battery consumption.

Another layout for the similar feature, this time unde the name *Background power consumption management*.

## Battery optimization

In the Battery section for each app, you can put the app into *not-optimized* pile of apps, which will prevent the app from being closed by the optimization processes.

1. Hold down the app icon, and click App Info.
2. In App Info menu, scroll to Battery and click on the percent use.
3. From the Battery Usage, click on Battery Optimization.
4. Make sure to set the app to "Not optimized".
