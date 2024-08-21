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

export const todoSchemaLiteral = {
  title: "todo schema",
  description: "describes a human being",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    name: {
      type: "string",
    },
    when: {
      type: "string",
    },
    where: {
      type: "string",
    },
    description: {
      type: "string",
    },
  },
  required: ["name", "when", "where", "description", "id"],
} as const;

/**
 * Creating document type from schema
 */
const schemaTyped = toTypedRxJsonSchema(todoSchemaLiteral);
export type ToDoDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;
// ===

export type ToDoDocMethods = {
  scream: (v: string) => string;
  getName: () => string;
};

export type ToDoDocument = RxDocument<ToDoDocType, ToDoDocMethods>;

// we declare one static ORM-method for the collection
export type ToDoCollectionMethods = {
  countAllDocuments: () => Promise<number>;
};

// and then merge all our types
export type ToDoCollection = RxCollection<
  ToDoDocType,
  ToDoDocMethods,
  ToDoCollectionMethods
>;

export type MyDatabaseCollections = {
  todos: ToDoCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

{
  /* 
        Define Schema, methods, collection methods which will be used in database 
    */
}

export const todoSchema: RxJsonSchema<ToDoDocType> = todoSchemaLiteral;

const todoDocMethods: ToDoDocMethods = {
  scream: function (this: ToDoDocument, what: string) {
    return this.name + " screams: " + what.toUpperCase();
  },
  getName: function (this: ToDoDocument) {
    return `${this.name} ${this.where}`;
  },
};
const todoCollectionMethods: ToDoCollectionMethods = {
  countAllDocuments: async function (this: ToDoCollection) {
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
    todos: {
      schema: todoSchema,
      methods: todoDocMethods,
      statics: todoCollectionMethods,
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
