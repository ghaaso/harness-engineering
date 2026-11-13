<!-- Trimmed from https://github.com/urbandroid-team/dont-kill-my-app @ 3616bc8b3b6b3910ac204e107ff0dfd6064f877c _vendors-content/google/{explanation,dev,user}.md (CC-BY-4.0; content by www.dontkillmyapp.com / Urbandroid Team; licence ../../LICENSE-urbandroid-dont-kill-my-app): kept explanation (intro and the Android 8+ bullet; the Doze sensor-batching and Android 6.0 bullets are cut), dev "Android P Background restriction" (its first two sentences; the authors' opinion that follows is cut) and the Doze tip, user sections Android P, Pie and pre-Pie, Android O; removed the Android 6.0 Doze-bug history and "If all fails" (turn Doze off in Developer options) -->
# Google / stock Android — from www.dontkillmyapp.com / Urbandroid Team

`_vendors/google.md` upstream is a link to `stock_android.md`; the content folder is `google/`.

## explanation.md

 On Pixel and Nexus devices you have the lowest chance of something going wrong with background processing, but still there are
  several places to look at!

  * After Android 8, users or even the system (Adaptive battery in Android 9) can decide to prevent your app's background processes from working and you may need to check the Background restrictions (or limits) option in your phone settings.

## dev.md

## Android P Background restriction

For apps whose core functionality is background processing this option basically means 'Break the app core functionality' and this is not always obvious for users. You would be surprised how many support cases we look back on having spent hours debugging, only to find users enabled this.

Tips:

* You can ask the user to make your app _not battery optimized_. See [https://developer.android.com/training/monitoring-device-state/doze-standby](https://developer.android.com/training/monitoring-device-state/doze-standby)

## user.md

## Android P

There's a special option in **Settings > Apps > Your app > Advanced > Battery > Background restrictions**. If users accidentally enable this option, it will break their apps. And users do enable that option!

## Pie and pre-Pie

If you see background processing issues, overall it is a good idea to make your app _not battery optimized_ to ensure it gets the freedom it needs to perform in the background.

For that:

1. Go to **Settings > Apps > Your app > Advanced > Battery > Battery optimization**

2. Change view to **All apps**

3. Search for your app

4. Choose **Not optimized**

## Android O

Make sure **Settings > Apps > Your app > Advanced > Battery > Background limitations** is not enabled. If the app is not yet optimized for Oreo API level it will break their background processing.
