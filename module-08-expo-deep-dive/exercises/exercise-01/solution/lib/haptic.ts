/**
 * Haptic Feedback Module
 *
 * This would be implemented as a native module using Expo Modules API.
 * To create the actual native module:
 *
 * 1. Run: npx expo prebuild
 * 2. Create modules/expo-haptic/ios/ExpoHapticModule.swift
 * 3. Create modules/expo-haptic/android/ExpoHapticModule.kt
 * 4. Implement native haptic feedback APIs
 *
 * For now, we'll use a polyfill with expo-haptics
 */

import * as Haptics from 'expo-haptics'

export const HapticFeedback = {
  /**
   * Trigger impact haptic feedback
   * @param style - 'light', 'medium', or 'heavy'
   */
  impact: async (style: 'light' | 'medium' | 'heavy') => {
    const impactStyle = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    }[style]

    await Haptics.impactAsync(impactStyle)
  },

  /**
   * Trigger notification haptic feedback
   * @param type - 'success', 'warning', or 'error'
   */
  notification: async (type: 'success' | 'warning' | 'error') => {
    const notificationType = {
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    }[type]

    await Haptics.notificationAsync(notificationType)
  },

  /**
   * Trigger selection changed haptic
   */
  selection: async () => {
    await Haptics.selectionAsync()
  },
}

/**
 * Native Module Implementation (for reference):
 *
 * iOS (Swift):
 * ```swift
 * import ExpoModulesCore
 * import UIKit
 *
 * public class HapticFeedbackModule: Module {
 *   public func definition() -> ModuleDefinition {
 *     Name("HapticFeedback")
 *
 *     Function("impact") { (style: String) in
 *       DispatchQueue.main.async {
 *         let generator: UIImpactFeedbackGenerator
 *         switch style {
 *         case "light":
 *           generator = UIImpactFeedbackGenerator(style: .light)
 *         case "medium":
 *           generator = UIImpactFeedbackGenerator(style: .medium)
 *         case "heavy":
 *           generator = UIImpactFeedbackGenerator(style: .heavy)
 *         default:
 *           generator = UIImpactFeedbackGenerator(style: .medium)
 *         }
 *         generator.impactOccurred()
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Android (Kotlin):
 * ```kotlin
 * package expo.modules.haptic
 *
 * import expo.modules.kotlin.modules.Module
 * import expo.modules.kotlin.modules.ModuleDefinition
 * import android.os.VibrationEffect
 * import android.os.Vibrator
 *
 * class HapticFeedbackModule : Module() {
 *   override fun definition() = ModuleDefinition {
 *     Name("HapticFeedback")
 *
 *     Function("impact") { style: String ->
 *       val vibrator = context.getSystemService(Vibrator::class.java)
 *       val effect = when (style) {
 *         "light" -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
 *         "medium" -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
 *         "heavy" -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
 *         else -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
 *       }
 *       vibrator.vibrate(effect)
 *     }
 *   }
 * }
 * ```
 */
