using System.Collections.Generic;
using System.Threading.Tasks;
using TodoBot.Shared;

namespace TodoBot.Client.Services
{
    public interface ITodoClient
    {
        Task CreateTodoAsync(string accessToken, Todo todo);
        Task DeleteTodoAsync(string accessToken, string userId, string id);
        Task<Todo> GetTodoAsync(string accessToken, string userId, string id);
        Task<IList<Todo>> GetTodoListAsync(string accessToken, string userId);
        Task UpdateTodoAsync(string accessToken, string id, Todo todo);
    }
}