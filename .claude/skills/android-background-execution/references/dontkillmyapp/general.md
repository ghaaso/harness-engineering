<!-- Trimmed from https://github.com/urbandroid-team/dont-kill-my-app @ 3616bc8b3b6b3910ac204e107ff0dfd6064f877c _vendors-content/general/{explanation,user}.md (CC-BY-4.0; content by www.dontkillmyapp.com / Urbandroid Team; licence ../../LICENSE-urbandroid-dont-kill-my-app): kept explanation, user sections Android 6+ and Android 8+; removed "Turn off doze" (developer options / `dumpsys deviceidle disable`) and "If all fails" (adb `pm uninstall --user 0`, rooting) — both change a roster phone's system state, see SKILL.md "Where upstream disagrees"; dev.md is empty upstream -->
# Any vendor (AOSP baseline) — from www.dontkillmyapp.com / Urbandroid Team

## explanation.md

  Whatever device you are using, don't blame the developers as the first thing when something goes wrong.
  First check your phone settings whether some background processing is not restricted on your device.

  See below for general solutions that apply for various vendors.

## user.md

### Android 6+

Always check the following setting:

- on older devices:<br>
_Phone settings > Battery & power saving > Battery usage > Ignore optimizations > Turn on_ to ignore battery optimization for your app.

- on newer devices:<br>
_Settings > Apps > Your app > Battery > Optimize battery usage > All (from the top) > Your app_ (toggle to disable).

### Android 8+

Check if **Phone settings > Apps & Notifications > Your app > Background restrictions** or **Background limits** are not enabled for the app.
