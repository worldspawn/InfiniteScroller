using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.UI.WebControls;

namespace InfiniteScroller.Controllers
{
    public class HomeController : Controller
    {
        //
        // GET: /Default1/

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult GetData(QueryFilter filter)
        {
            
        }


    }

    public class SampleItem
    {
        public string Name { get; set; }
        public string Group { get; set; }
    }

    public interface IQueryFilter
    {
        int Take { get; }
        int Skip { get; }
        string SortBy { get; }
        SortDirection SortDirection { get; }
    }

    public class QueryFilter : IQueryFilter
    {
        public int Take { get; set; }
        public int Skip { get; set; }
        public string SortBy { get; set; }
        public SortDirection SortDirection { get; set; }
    }
}
