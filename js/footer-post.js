function loadFooterPosts(){fetch("/data/blog-articles.json").then(t=>{if(!t.ok)throw Error("Не удалось загрузить blog-articles.json");return t.json()}).then(t=>{Array.isArray(t)&&0!==t.length&&renderFooterRandomPosts(t)}).catch(t=>{console.error("Footer posts error:",t)})}function renderFooterRandomPosts(t){let e=document.getElementById("footer-recent-posts");if(!e)return;let s=[...t];for(let o=s.length-1;o>0;o--){let r=Math.floor(Math.random()*(o+1));[s[o],s[r]]=[s[r],s[o]]}let l=s.slice(0,3);e.innerHTML=l.map(t=>{let e=function t(e){if(!e)return null;let s=e.split(".");if(3!==s.length)return null;let[o,r,l]=s.map(Number);return new Date(l,r-1,o)}(t.date);return e?`
        <div class="widget-post clearfix">
          <div class="sx-post-date text-center text-uppercase text-white">
            <strong class="p-date">${e.getDate()}</strong>
            <span class="p-month">${e.toLocaleString("ru-RU",{month:"short"})}</span>
            <span class="p-year">${e.getFullYear()}</span>
          </div>

          <div class="sx-post-info">
            <div class="sx-post-header">
              <h6 class="post-title">
                <a href="/blog/${t.slug}">
                  ${t.title}
                </a>
              </h6>
            </div>

            <div class="sx-post-meta">
              <ul>
                <li class="post-author">
                  <i class="fa fa-user"></i>
                  ${t.author||"Ольга Турко"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      `:""}).join("")}document.addEventListener("DOMContentLoaded",()=>{loadFooterPosts()});