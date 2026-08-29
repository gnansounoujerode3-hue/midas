plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "bj.midas.wallet"
    compileSdk = 35

    defaultConfig {
        applicationId = "bj.midas.wallet"
        minSdk = 31
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0-demo"
        // Adresse de secours : l'interface essaie automatiquement .199 puis .200.
        buildConfigField("String", "BACKEND_URL", "\"https://192.168.1.200:3443\"")
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.fragment:fragment-ktx:1.8.6")
}
