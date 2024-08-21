import React, { useEffect, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";

import { getDatabase } from "../schema/database";

export const GET_TODOLIST = gql`
  query listTodos {
    listTodos {
      items {
        description
        id
        name
        when
        where
      }
    }
  }
`;

export const ADD_TODO = gql`
  mutation createTodo($createtodoinput: CreateTodoInput!) {
    createTodo(input: $createtodoinput) {
      where
      when
      name
      id
      description
    }
  }
`;

export const UPDATE_TODO = gql`
  mutation updateToDo($updatetodoinput: UpdateTodoInput!) {
    updateTodo(input: $updatetodoinput) {
      id
      description
      name
      when
      where
    }
  }
`;

export const DELETE_TODO = gql`
  mutation deleteToDo($deletetodoinput: DeleteTodoInput!) {
    deleteTodo(input: $deletetodoinput) {
      id
    }
  }
`;

const ToDoList = () => {
  const [todos, setTodos] = useState<any[]>([]);
  const [db, setDb] = useState<any>(null);
  const { loading, error, data } = useQuery(GET_TODOLIST);
  const [createTodo] = useMutation(ADD_TODO, {
    refetchQueries: [{ query: GET_TODOLIST }],
  });

  const [deleteTodo] = useMutation(DELETE_TODO, {
    refetchQueries: [{ query: GET_TODOLIST }],
  });

  const [isUpdate, setIsUpdate] = useState(false);

  const [updateTodo] = useMutation(UPDATE_TODO, {
    refetchQueries: [{ query: GET_TODOLIST }],
  });

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const database = await getDatabase();
        setDb(database);
        const todosList = await database.todos?.find().exec();
        setTodos(todosList || []);
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    };
    initializeDatabase();
  }, []);

  useEffect(() => {
    if (db) {
      const subscription = db.todos.find().$.subscribe(async (todos: any) => {
        // Manually trigger a refresh of RxDB data
        setTodos(todos || []);
        setForm({ name: "", when: "", where: "", description: "" });
      });
      // Cleanup subscription on component unmount
      return () => subscription.unsubscribe();
    }
  }, [db]);

  // const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({
    name: "",
    when: "",
    where: "",
    description: "",
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const { data } = await createTodo({
        variables: {
          createtodoinput: form,
        },
      });
      const newTodoId = data.createTodo.id;
      if (db) {
        await db.todos?.insert({
          id: newTodoId,
          name: form.name,
          where: form.where,
          when: form.when,
          description: form.description,
        });
      }
    } catch (error) {
      console.error("Error adding todo:", error);
    }

    setIsUpdate(false);

    // setForm({ name: "", when: "", where: "", description: "" });
  };

  //   if (loading) {
  //     return <p>Loading...</p>; // Return a JSX element for loading state
  //   }

  if (error) {
    return <p>Error: {error.message}</p>; // Return a JSX element for error state
  }

  const toDoList = data?.listTodos?.items;
  console.log("toDoList", toDoList);

  const updateToDo = async (item: any) => {
    if (!isUpdate) {
      setForm(item);
      setIsUpdate(true);
    } else {
      if (db) {
        const todoFromRxDB = await db.todos?.findOne(item.id).exec();
        if (todoFromRxDB) {
          await todoFromRxDB.patch({
            id: item.id,
            name: form.name ? form.name : item.name,
            where: form.where ? form.where : item.where,
            when: form.when ? form.when : item.when,
            description: form.description ? form.description : item.description,
          });
        } else {
          console.error(`Todo with ID ${item.id} not found in RxDB.`);
        }
        await updateTodo({
          variables: {
            updatetodoinput: {
              name: form.name,
              when: form.when,
              where: form.where,
              description: form.description,
              id: item.id,
            },
          },
        });
      }
      //   setForm({ name: "", when: "", where: "", description: "" });
    }
  };

  const deleteToDo = async (item: any) => {
    if (db) {
      // Remove from RxDB
      const todoFromRxDB = await db.todos?.findOne(item.id).exec();
      if (todoFromRxDB) {
        await todoFromRxDB.remove();
      } else {
        console.error(`Todo with ID ${item.id} not found in RxDB.`);
      }
      // Remove from GraphQL
      await deleteTodo({
        variables: {
          deletetodoinput: {
            id: item.id,
          },
        },
      });
    }
  };

  return (
    <>
      <h1>To Do List with AppSync</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", justifyContent: "space-around", margin: 40 }}
      >
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="when"
          placeholder="When"
          value={form.when}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="where"
          placeholder="Where"
          value={form.where}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          required
        />
        <button type="submit">Add To-Do</button>
      </form>
      {toDoList?.map((item: any, id: any) => {
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              margin: 40,
              justifyContent: "space-between",
              marginTop: 100,
            }}
            key={id}
          >
            <div>
              <div>Name : {item.name}</div>
              <div>When : {item.when}</div>
              <div>Where : {item.where}</div>
              <div>Description : {item.description}</div>
            </div>
            <div
              style={{
                margin: 10,
                width: "20%",
                justifyContent: "space-between",
                display: "flex",
                alignItems: "center",
              }}
            >
              <button
                style={{ height: 40, width: 100 }}
                onClick={() => updateToDo(item)}
              >
                Update To-Do
              </button>
              <button
                style={{ height: 40, width: 100 }}
                onClick={() => deleteToDo(item)}
              >
                Delete To-Do
              </button>
            </div>
          </div>
        );
      })}
      {
        <div>
          <h1> From RxDB </h1>
          {todos?.map((item: any, id: any) => {
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  margin: 40,
                  justifyContent: "space-between",
                  marginTop: 100,
                }}
                key={id}
              >
                <div>
                  <div>Name : {item.name}</div>
                  <div>When : {item.when}</div>
                  <div>Where : {item.where}</div>
                  <div>Description : {item.description}</div>
                </div>
                <div
                  style={{
                    margin: 10,
                    width: "20%",
                    justifyContent: "space-between",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <button
                    style={{ height: 40, width: 100 }}
                    onClick={() => updateToDo(item)}
                  >
                    Update To-Do
                  </button>
                  <button
                    style={{ height: 40, width: 100 }}
                    onClick={() => deleteToDo(item)}
                  >
                    Delete To-Do
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      }
    </>
  );
};
export default ToDoList;
