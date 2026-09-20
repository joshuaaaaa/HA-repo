# Most do stranky: metody s @JavascriptInterface volá WebView pres reflexi,
# takze je shrinker nesmi prejmenovat ani odstranit.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
