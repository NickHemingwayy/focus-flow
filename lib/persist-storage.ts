// "use client";

// // This script attempts to use the Storage Persistence API to ensure
// // data stored in IndexedDB, etc., is not automatically cleared by the browser.

// async function persist() {
//   if (navigator.storage?.persist) {
//     return await navigator.storage.persist();
//   }
//   return false;
// }

// async function isStoragePersisted() {
//   if (navigator.storage?.persisted) {
//     return await navigator.storage.persisted();
//   }
//   return false;
// }
// // Use a self-invoking async function to handle the persistence logic.
// (async () => {
//   if (!navigator.storage) {
//     console.log("Storage Manager API not supported. Cannot persist storage.");
//     return;
//   }

//   try {
//     if (await isStoragePersisted()) {
//       console.log(":) Storage is successfully persisted.");
//     } else {
//       console.log(":( Storage is not persisted. Trying to persist...");
//       if (await persist()) {
//         console.log(":) We successfully turned the storage to be persisted.");
//       } else {
//         console.log(
//           ":( Failed to make storage persisted. This might be because the browser denied the request, or the site has not been used enough.",
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error checking or requesting storage persistence:", error);
//   }
// })();
