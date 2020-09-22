using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TodoBot.Client.Services;
using TodoBot.Shared;

namespace TodoBot.Client.Srvices
{
    /// <summary>
    /// Mock client to save Todo items to an in-memory store
    /// </summary>
    public class MockTodoClient : ITodoClient
    {
        private readonly IList<Todo> todoList = new List<Todo>();

        public Task<IList<Todo>> GetTodoListAsync(string accessToken, string userId)
        {
            return Task.FromResult(todoList.Where(x=>x.UserId==userId).ToList() as IList<Todo>);
        }

        public Task<Todo> GetTodoAsync(string accessToken, string userId, string id)
        {
            return Task.FromResult(todoList.FirstOrDefault(x => x.UserId == userId && x.Id == id));
        }

        public async Task UpdateTodoAsync(string accessToken, string id, Todo todo)
        {
            var target = await GetTodoAsync(accessToken, todo.UserId, id);
            target.Title = todo.Title;
            target.Content = todo.Content;
            target.Status = todo.Status;
            target.DueDate = todo.DueDate;
        }

        public Task CreateTodoAsync(string accessToken, Todo todo)
        {
            todo.Id = Guid.NewGuid().ToString();
            todoList.Add(todo);
            return Task.CompletedTask;
        }

        public async Task DeleteTodoAsync(string accessToken, string userId, string id)
        {
            todoList.Remove(await GetTodoAsync(accessToken, userId, id));
        }

    }
}
