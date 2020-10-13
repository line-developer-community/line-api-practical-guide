using LineDC.CEK;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;

namespace ClovaVentriloquism
{
    public interface IDurableClova : IClova
    {
        IDurableClient DurableClient { get; set; }
    }
}
