using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using TodoBot.Shared;

namespace TodoBot.Client.Services
{
    public class TodoClient : ITodoClient
    {
        private readonly string requestUrl;
        private readonly HttpClient httpClient;
       
        public TodoClient(HttpClient httpClient, string requestUrl)
        {
            this.requestUrl = requestUrl;
            this.httpClient = httpClient;
        }

        public async Task<IList<Todo>> GetTodoListAsync(string accessToken, string userId)
        {
            SetAccessTokenHeader(accessToken);
            return await httpClient.GetFromJsonAsync<IList<Todo>>($"{requestUrl}/api/{userId}/todoList");
        }

        public async Task<Todo> GetTodoAsync(string accessToken, string userId, string id)
        {
            SetAccessTokenHeader(accessToken);
            return await httpClient.GetFromJsonAsync<Todo>($"{requestUrl}/api/{userId}/todoList/{id}");
        }

        public async Task UpdateTodoAsync(string accessToken, string id, Todo todo)
        {
            SetAccessTokenHeader(accessToken);
            var response = await httpClient.PutAsJsonAsync($"{requestUrl}/api/todoList/{id}", todo);
            response.EnsureSuccessStatusCode();
        }

        public async Task CreateTodoAsync(string accessToken, Todo todo)
        {
            SetAccessTokenHeader(accessToken);
            var response = await httpClient.PostAsJsonAsync($"{requestUrl}/api/todoList", todo);
            response.EnsureSuccessStatusCode();
        }

        public async Task DeleteTodoAsync(string accessToken, string userId, string id)
        {
            SetAccessTokenHeader(accessToken);
            var response = await httpClient.DeleteAsync($"{requestUrl}/api/{userId}/todoList/{id}");
            response.EnsureSuccessStatusCode();
        }
        private void SetAccessTokenHeader(string accessToken)
        {
            httpClient.DefaultRequestHeaders.Clear();
            httpClient.DefaultRequestHeaders.Add(ApiServer.AccessTokenHeaderName, accessToken);
        }
    }
}
