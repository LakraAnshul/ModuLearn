/**
 * Development Console Utilities for Topic Timestamp Feature
 * Accessible only in development mode via window.modulearn
 */

import { clearTopicTimestampCache } from './topicTimestampService.ts';
import { runHealthCheck, logDiagnosticReport, generateDiagnosticReport } from './timestampDiagnostics.ts';
import { TIMESTAMP_CONFIG } from './timestampConfig.ts';

export const setupDevTools = (): void => {
  // Only available in dev mode
  if (import.meta.env.PROD) {
    return;
  }

  // Expose to window for easy access
  (window as any).modulearn = {
    timestamp: {
      // Configuration
      config: TIMESTAMP_CONFIG,

      // Commands
      commands: {
        /**
         * Clear all cached topic timestamps
         * Usage: modulearn.timestamp.commands.clearCache()
         */
        clearCache: () => {
          clearTopicTimestampCache();
          console.log('✓ Topic timestamp cache cleared');
        },

        /**
         * Health check for timestamp feature
         * Usage: modulearn.timestamp.commands.healthCheck()
         */
        healthCheck: () => {
          const result = runHealthCheck();
          console.log('🏥 Health Check Results:');
          Object.entries(result.status).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
          console.log(`Overall: ${result.healthy ? '✓ Healthy' : '✗ Issues detected'}`);
          return result;
        },

        /**
         * Show cache contents
         * Usage: modulearn.timestamp.commands.showCache()
         */
        showCache: () => {
          const keys = Object.keys(localStorage).filter((k) => k.includes('modulearn:topic_timestamps:'));

          if (keys.length === 0) {
            console.log('Cache is empty');
            return;
          }

          console.log(`📦 Cached Entries (${keys.length}):`);
          keys.forEach((key) => {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              const expired = Date.now() > parsed.expiresAt ? ' [EXPIRED]' : '';
              console.log(`  • ${key.replace('modulearn:topic_timestamps:', '')}${expired}`);
            }
          });

          return keys;
        },

        /**
         * Get specific cache entry
         * Usage: modulearn.timestamp.commands.getCacheEntry('videoId|topic|module')
         */
        getCacheEntry: (key: string) => {
          const fullKey = `modulearn:topic_timestamps:${key}`;
          const stored = localStorage.getItem(fullKey);

          if (!stored) {
            console.log(`❌ Cache entry not found: ${key}`);
            return null;
          }

          const parsed = JSON.parse(stored);
          console.log('📋 Cache Entry:', parsed);
          return parsed;
        },

        /**
         * Delete specific cache entry
         * Usage: modulearn.timestamp.commands.deleteCacheEntry('videoId|topic|module')
         */
        deleteCacheEntry: (key: string) => {
          const fullKey = `modulearn:topic_timestamps:${key}`;
          localStorage.removeItem(fullKey);
          console.log(`✓ Deleted cache entry: ${key}`);
        },

        /**
         * Show memory usage
         * Usage: modulearn.timestamp.commands.memoryUsage()
         */
        memoryUsage: () => {
          const keys = Object.keys(localStorage).filter((k) => k.includes('modulearn:'));
          let totalSize = 0;

          const breakdown: Record<string, number> = {};
          keys.forEach((key) => {
            const item = localStorage.getItem(key) || '';
            const size = item.length;
            totalSize += size;

            const category = key.split(':')[1] || 'other';
            breakdown[category] = (breakdown[category] || 0) + size;
          });

          console.log('💾 Memory Usage:');
          Object.entries(breakdown).forEach(([category, size]) => {
            const mb = (size / 1024 / 1024).toFixed(3);
            console.log(`  ${category}: ${mb}MB (${(size / 1024).toFixed(0)}KB)`);
          });

          const totalMB = (totalSize / 1024 / 1024).toFixed(3);
          console.log(`Total: ${totalMB}MB`);

          return breakdown;
        },

        /**
         * Display all available commands
         * Usage: modulearn.timestamp.commands.help()
         */
        help: () => {
          console.log(`
🎯 Topic Timestamp Dev Tools
Available commands:

1. clearCache()
   → Clear all cached timestamps

2. healthCheck()
   → Run feature health check

3. showCache()
   → List all cache entries

4. getCacheEntry('videoId|topic|module')
   → Get specific cache entry

5. deleteCacheEntry('videoId|topic|module')
   → Delete specific cache entry

6. memoryUsage()
   → Show localStorage memory breakdown

7. help()
   → Show this help message

8. config
   → View current configuration

Examples:
  modulearn.timestamp.commands.healthCheck()
  modulearn.timestamp.commands.showCache()
  modulearn.timestamp.config.enabled = false  // Disable feature
          `);
        },
      },

      /**
       * Display welcome message
       */
      info: () => {
        console.log(`
✅ Topic Timestamp Feature (Dev Mode)
Commands available at: modulearn.timestamp.commands.*
Configuration at: modulearn.timestamp.config

Run: modulearn.timestamp.commands.help()
        `);
      },
    },
  };

  // Show welcome message
  (window as any).modulearn.timestamp.info();
};

// Auto-setup in development
if (import.meta.env.DEV) {
  setupDevTools();
}
