/* eslint-disable no-console */
import {
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxCollection,
  RxDatabase,
  RxDocument,
  RxJsonSchema,
  addRxPlugin,
  createRxDatabase,
  toTypedRxJsonSchema,
} from "rxdb";

import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

addRxPlugin(RxDBQueryBuilderPlugin);

export const heroSchemaLiteral = {
  title: "hero schema",
  description: "describes a human being",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    firstName: {
      type: "string",
    },
    lastName: {
      type: "string",
    },
    age: {
      type: "integer",
    },
  },
  required: ["firstName", "lastName", "id"],
} as const;

/**
 * Creating document type from schema
 */
const schemaTyped = toTypedRxJsonSchema(heroSchemaLiteral);
export type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;
// ===

export type HeroDocMethods = {
  scream: (v: string) => string;
  fullName: () => string;
};

export type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>;

// we declare one static ORM-method for the collection
export type HeroCollectionMethods = {
  countAllDocuments: () => Promise<number>;
};

// and then merge all our types
export type HeroCollection = RxCollection<
  HeroDocType,
  HeroDocMethods,
  HeroCollectionMethods
>;

export type MyDatabaseCollections = {
  heroes: HeroCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

{
  /* 
      Define Schema, methods, collection methods which will be used in database 
  */
}

export const heroSchema: RxJsonSchema<HeroDocType> = heroSchemaLiteral;

const heroDocMethods: HeroDocMethods = {
  scream: function (this: HeroDocument, what: string) {
    return this.firstName + " screams: " + what.toUpperCase();
  },
  fullName: function (this: HeroDocument) {
    return `${this.firstName} ${this.lastName}`;
  },
};
const heroCollectionMethods: HeroCollectionMethods = {
  countAllDocuments: async function (this: HeroCollection) {
    const allDocs = await this.find().exec();
    return allDocs.length;
  },
};

{
  /* 
    CREATE DATABASE OBJECT
  */
}

let dbPromise: Promise<MyDatabase>;
const _create = async () => {
  console.log("Creating database...");
  /**
   * create database and collections
   */
  if (process.env.NODE_ENV !== "production") {
    await import("rxdb/plugins/dev-mode").then((module) =>
      addRxPlugin(module.RxDBDevModePlugin)
    );
  }

  const db: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
    name: "mydb2",
    storage: getRxStorageDexie(),
  });

  await db.addCollections({
    heroes: {
      schema: heroSchema,
      methods: heroDocMethods,
      statics: heroCollectionMethods,
    },
  });

  return db;
};

{
  /*
    Singleton method to get database object 
  */
}

export const getDatabase = () => {
  if (!dbPromise) {
    dbPromise = _create();
  }
  return dbPromise;
};
