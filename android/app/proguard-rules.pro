# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Preserving line numbers for better crash reports in Play Console
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor / Cordova specific rules
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class com.google.android.gms.internal.** { *; }
-dontwarn com.google.android.gms.**

