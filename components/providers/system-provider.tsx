"use client";

import { AppSchema } from "@/lib/powersync/app-schema";
import { BackendConnector } from "@/lib/powersync/backend-connector";
import { PowerSyncContext } from "@powersync/react";
import {
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  createBaseLogger,
  LogLevel,
} from "@powersync/web";
import React, { Suspense } from "react";

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

const factory = new WASQLiteOpenFactory({
  dbFilename: "notes.db",
  // Use the pre-bundled worker from public/@powersync/
  // This is required since Turbopack doesn't support dynamic imports of workers yet
  worker: "/@powersync/worker/WASQLiteDB.umd.js",
});

export const db = new PowerSyncDatabase({
  database: factory,
  schema: AppSchema,
  flags: {
    disableSSRWarning: true,
    // enableMultiTabs: true,
  },
  sync: {
    // Use the pre-bundled sync worker from public/@powersync/
    worker: "/@powersync/worker/SharedSyncImplementation.umd.js",
  },
});

// const connector = new BackendConnector();
// db.connect(connector);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense>
      <PowerSyncContext.Provider value={db}>
        {children}
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
