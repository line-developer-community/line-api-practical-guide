using System.Collections.Generic;
using System.Threading.Tasks;
using TodoBot.Shared;

namespace TodoBot.Server.Services
{
    public interface ITodoRepository
    {
        Task<string> CreateTodoAsync(Todo todo);
        Task UpdateTodoAsync(string id, Todo todo);
        Task<IList<Todo>> GetTodoListAsync(string userId);
        Task<Todo> GetTodoAsync(string userId, string id);
        Task DeleteTodoAsync(string userId, string id);
    }
}