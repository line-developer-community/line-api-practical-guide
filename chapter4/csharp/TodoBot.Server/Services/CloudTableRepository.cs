using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TableStorage.Abstractions.POCO;
using TodoBot.Shared;

namespace TodoBot.Server.Services
{
    public class CloudTableRepository : ITodoRepository
    {
        private readonly PocoTableStore<Todo, string, string> tableStore;
        private readonly string tableName = "TodoList";

        public CloudTableRepository(string connectionString)
        {
            tableStore = new PocoTableStore<Todo, string, string>(
                tableName,
                connectionString,
                partitionProperty: todo => todo.UserId,
                rowProperty: todo => todo.Id);
            if (!tableStore.TableExists())
            {
                tableStore.CreateTable();
            }
        }

        public async Task<string> CreateTodoAsync(Todo todo)
        {

            todo.Id = Guid.NewGuid().ToString().Replace("-", "");
            await tableStore.InsertAsync(todo);
            return todo.Id;

        }

        public async Task UpdateTodoAsync(string id, Todo todo)
        {

            todo.Id = id;
            await tableStore.UpdateAsync(todo);

        }

        public async Task<IList<Todo>> GetTodoListAsync(string userId)
        {

            var query = await tableStore.GetByPartitionKeyAsync(userId);
            return query.OrderBy(todo => todo.DueDate).ToList();

        }

        public Task<Todo> GetTodoAsync(string userId, string id)
        {
            return tableStore.GetRecordAsync(userId, id);
        }

        public async Task DeleteTodoAsync(string userId, string id)
        {
            await tableStore.DeleteAsync(new Todo() { UserId = userId, Id = id });

        }
    }
}