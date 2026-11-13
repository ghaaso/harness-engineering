<!-- Trimmed from https://github.com/urbandroid-team/dont-kill-my-app @ 3616bc8b3b6b3910ac204e107ff0dfd6064f877c _vendors-content/oppo/{explanation,dev,user}.md (CC-BY-4.0; content by www.dontkillmyapp.com / Urbandroid Team; licence ../../LICENSE-urbandroid-dont-kill-my-app): kept all sections (Oppo F1S, Allow Auto Start-up, Power Saver modes); removed images; figure captions kept as plain lines -->
# Oppo (ColorOS) — from www.dontkillmyapp.com / Urbandroid Team

Upstream front matter: name Oppo, award 4 (`_vendors/oppo.md`). The component named under "Oppo
F1S" differs from AutoStarter's (`../autostarter-intents.md`); neither is device-verified.

## explanation.md

We have currently only information for Oppo F1S, but on other models the situation may well be similar.

## dev.md

No known solution on the dev end

## user.md

## Oppo F1S

Background services are being killed (including accessibility services, which then need re-enabling) every time you turn the screen off. So far, a workaround for this is:

* Pin your app to the recent apps screen.

* Enable your app in the app list inside the security app's "startup manager" and "floating app list" (com.coloros.safecenter / com.coloros.safecenter.permission.Permission).

* Turn off battery optimizations.

* Give the service a persistent notification to remain in the foreground.

All four of those need to be done before the app would function.

Open App management.
Toggle to allow Your app.
App info -> Battery usage
Choose Run in background.

Here are links to some other resources verifying that some of the above steps work on other Oppo devices:

* [XDA developers](https://forum.xda-developers.com/android/general/coloros-5-0-how-to-allow-apps-running-t3847738)

* [XDA developers](https://forum.xda-developers.com/find-X/help/killing-apps-screen-off-arghh-t3818105)

* [Oppo customer service portal](https://oppo-au.custhelp.com/app/answers/detail/a_id/1313/~/how-to-lock-applications-in-the-background%3F)

* [Quora](https://www.quora.com/How-do-you-add-apps-into-Whitelist-in-OPPO-F1s-phone)

## Allow Auto Start-up

On Color OS 6, you need to enable automatic start from the background in the App's info page.

App info -> Allow Auto Start-up

## Power Saver modes

You can choose one of three power-saving options under each app and allow the app to run in the background. If something like smart restriction is enabled and if the app is not cleared from the tasks, it should be running background processes but if the app is closed, the background services are paused and are resumed immediately when the app is opened again.

App info ->Power Saver
Choices for the Power saver modes.
