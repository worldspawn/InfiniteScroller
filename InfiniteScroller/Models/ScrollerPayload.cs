using System.Collections.Generic;

namespace InfiniteScroller.Models
{
    public class ScrollerPayload<T>
    {
        public int? Total { get; set; }
        public IEnumerable<T> Data { get; set; }
    }
}