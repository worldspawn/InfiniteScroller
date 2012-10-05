using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace InfiniteScroller.Extensions
{
    public static class HtmlExtensions
    {
        public static MvcHtmlString ToJson<T>(this HtmlHelper<T> helper, object data)
        {
            return new MvcHtmlString(JsonConvert.SerializeObject(data));
        }
    }
}