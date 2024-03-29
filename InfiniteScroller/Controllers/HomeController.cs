﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Web;
using System.Web.Mvc;
using System.Web.UI.WebControls;
using InfiniteScroller.Models;
using TestData.Profiles;
using TestData.Profiles.ValueCreators;

namespace InfiniteScroller.Controllers
{
    public class HomeController : Controller
    {
        static HomeController()
        {
            var profile = new ProfileResolver();

            var sampleProfile = new DataProfile<SampleItem>(() => new SampleItem())
            .ForMember(x => x.Name, new RandomStringValueCreator(4, 8))
            .ForMember(x => x.Group, new RandomStringValueCreator(4, 8))
            .Generate(profile, 2050);

            _demoItems = sampleProfile.ToList();
        }

        private static readonly IList<SampleItem> _demoItems;

        public ActionResult Index()
        {
            var total = _demoItems.Count;
            return View(new ScrollerPayload<SampleItem>() { Data = _demoItems.Skip(0).Take(100).OrderBy(x=>x.Name), Total = total });
        }

        public ActionResult GetData(QueryFilter filter)
        {
            var items = _demoItems.AsQueryable().Skip(filter.Skip).Take(filter.Take);
            Expression<Func<SampleItem, object>> orderby = null;

            if (filter.SortBy == "Name")
            {
                orderby = (x) => x.Name;
            }

            if (orderby != null)
            {
                if (filter.SortDirection == SortDirection.Ascending)
                    items = items.OrderBy(orderby);
                else
                    items = items.OrderByDescending(orderby);
            }

            int? total = null;
            if (filter.Skip == 0)
                total = _demoItems.Count;

            return Json(new ScrollerPayload<SampleItem>
            {
                Data = items,
                Total = total
            });
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
