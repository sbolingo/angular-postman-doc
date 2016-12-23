var postman = angular.module('angularPostmanDoc', []);

postman.factory('Postman', function($q, $http, $sce){

  var jsonUrl;

  var collection;
  var htmlDoc = "";

  var _folders = [];
  var _requests = [];

  function reset(){
    collection = undefined;
    htmlDoc = "";
    _folders = [];
    _requests = [];
  }

  function fromUrl(url){
    reset();

    var asyncFunction = function(resolve, reject){
      $http.get(url).then(
        function(res){
          jsonUrl = url;
          collection = angular.copy(res.data);
          resolve(res);
        },
        function(res){
          reject(res);
        }
      );
    }

    return $q(asyncFunction,10);
  }

  function getJsonUrl(){
    return jsonUrl;
  }

  function setCollection(json){
    reset();
    collection = angular.copy(json);
  }

  function getCollection(){
    return collection;
  }

  function getHTMLDoc(){
    return $sce.trustAsHtml(htmlDoc);
  }

  function getRequestWithId(reqs, requestId){
    var retReq = null;
    reqs.forEach(function(req) {
      if(req.id==requestId) {
        retReq = req;
      }
    });
    return retReq;
  }

  function toUnderscore(camelCase){
    if(!angular.isString(camelCase) || camelCase.trim() == ""){
      return "";
    }
    var f = camelCase.charAt(0).toLowerCase();
    return f +
      camelCase
        .substr(1)
          .replace(/[A-Z ]/g,
            function(c) {
              return c.trim() == "" ? '-' : /*'-' +*/ c.toLowerCase();
            }
          );
  };

  function buildHTMLDoc(repeatFoldername, useShowdownjs){
    var json = angular.fromJson(collection);
    var folders = json.folders;
    var requests = json.requests;

    var colorMe = function (string){
      return string
              .replace(/[\{\}\[\]\,\"\'\:]/g,
                function(c) {
                  return "<span class='p'>"+c+"</span>";
                }
              )
              .replace(/true|false/gi,
                function(c) {
                  return "<span class='k'>"+c+"</span>";
                }
              )
              .replace(/([^a-z])([0-9])(?=[^a-z])|null/gi,
                function(c) {
                  return "<span class='mi'>"+c+"</span>";
                }
              );
    };

    var requestToHTML = function (req, folderName){

      var reqId = "";

      var html = '<table ';

      if(angular.isString(folderName) && folderName.trim() != ""){
        html += 'id="'+toUnderscore(folderName)+'-m-'+toUnderscore(req.name)+'" '
      }

      html += 'class="novice novice-postman table-request table table-bordered"><tbody>';
			html += '<tr><td class="novice novice-postman name" colspan="2">';
      if(repeatFoldername){
        html += folderName+": ";
      }
      html += req.name+'</td></tr>';
			if(req.description) {
        if(useShowdownjs){
          var converter = new showdown.Converter();
          converter.setOption('tables', true);
          html += '<tr><td class="table-responsive novice novice-postman description" colspan="2">'+converter.makeHtml(req.description)+'</td></tr>';
        }
        else{
            html += '<tr><td class="novice novice-postman description" colspan="2">'+req.description+'</td></tr>';
        }
			}
			html += '<tr><td>Headers:</td><td class="novice novice-postman headers">'+req.headers+'</td></tr>';
			html += '<tr><td>Method:</td><td class="novice novice-postman method"><span class="method '+req.method.toLowerCase()+'">'+req.method+'</span></td></tr>';
			html += '<tr><td>URL:</td><td class="novice novice-postman url">'+req.url+'</td></tr>';
			if(req.dataMode==='params' && req.data && req.data instanceof Array && req.data.length > 0) {
				// form values
				html += '<tr><td>Params:</td><td>';
				var paramTable = '<table class="novice novice-postman params">';
				req.data.forEach(function(param) {
					paramTable += '<tr><td>Key:</td><td>'+param.key+'</td></tr>';
					paramTable += '<tr><td>Value:</td><td>'+param.type+'</td></tr>';
					paramTable += '<tr><td>Type:</td><td>'+param.value+'</td></tr>';
				});
				paramTable += '</table>';
				html += paramTable;
				html += '</td></tr>';
			} else {
				// raw e.g. JSON or file
				var data = req.data;
				if(req.headers &&
						req.headers.toLowerCase().indexOf('content-type: application/json')!=-1) {
					try {
            data = angular.isString(req.rawModeData) && req.rawModeData.trim() != "" ? req.rawModeData : data;
            if((angular.isArray(data) && data.length > 0) || (angular.isString(data) && data.trim() != "")){
              data = '<pre class="novice novice-postman raw">'+colorMe(angular.toJson(angular.fromJson(data), 2))+'</pre>';
            }
            else{
              data = "none";
            }

					} catch(e) { console.error("Unable to prettify JSON: " + e); }

          html += '<tr><td>Data:</td><td>'+data+'</td></tr>';

				}
			}
      html += '</tbody></table>';
      return html;
    }

    htmlDoc = '<div class="novice novice-postman">';

    htmlDoc += '<h1 class="title">'+json.name+'</h1>';

    if(folders && folders.length>0) {
	      folders.forEach(function(folder) {
		        htmlDoc += '<h2 id="'+toUnderscore(folder.name)+'" class="novice novice-postman folder">'+folder.name+'</h2>';
            var fname = folder.name;
		          folder.order.forEach(function(requestId) {
			          var req = getRequestWithId(requests, requestId);
			          if(req) htmlDoc += requestToHTML(req, fname);
		          });
	      });

    } else {
      requests.forEach(function(req) {
        htmlDoc += requestToHTML(req);
      });
    }

    htmlDoc += "</div>";

    return $sce.trustAsHtml(htmlDoc);
  }

  function getFolders(){
    if(_folders.length > 0){
      return _folders;
    }

    var json = angular.fromJson(collection);
    var folders = json.folders;
    getRequests();

    if(folders && folders.length>0) {
	      folders.forEach(function(folder) {
		          folder.order.forEach(function(requestId) {
			          var req = getRequestWithId(_requests, requestId);
			          if(req){
                   if(!angular.isArray(folder.requests)){
                     folder.requests = [];
                   }
                   folder.requests.push(req);
                }
		          });
	      });
        _folders = folders;
    }

    return _folders;
  }

  function getRequests(){
    if(_requests.length > 0){
      return _requests;
    }
    var json = angular.fromJson(collection);
    _requests = json.requests;

    return _requests;
  }



  return {
    getJsonUrl: getJsonUrl,
    setCollection: setCollection,
    getCollection: getCollection,
    getHTMLDoc: getHTMLDoc,
    getFolders: getFolders,
    getRequests: getRequests,

    getRequestWithId: getRequestWithId,

    toUnderscore: toUnderscore,

    fromUrl: fromUrl,
    buildHTMLDoc: buildHTMLDoc
  };
});

postman.directive('postmanCollection', function(Postman, $compile, $http, $templateCache, $timeout, $anchorScroll){
  var n = {
    url: "postmanCollection",
    template: "templateUrl",
    showdownjs: "markdownDescription", //dependence: bower install showdown
    repeatFoldername: "repeatFoldername",
    noCache: "noCache"
  };

  return {
    restrict: "A",
    link: function (scope, element, attrs){

      var anchor = function(){
        $timeout(function (){$anchorScroll()},5);
      };

      var render = function (c){
        element.append(c);
        $compile(element.contents())(scope);
        anchor();
      };

      var renderHTML = function (html){
        scope.htmlDoc = html;
        render(angular.element('<div ng-bind-html="htmlDoc"></div>'));
      };

      var renderCache = function(){
        render($templateCache.get(attrs[n.template]));
      }

      if(attrs[n.url] == Postman.getJsonUrl() && angular.isUndefined(attrs[n.template]) && Postman.getHTMLDoc() != ""){
        //console.log("Get same");
        renderHTML(Postman.getHTMLDoc());
        return;
      }

      var useShowdownjs = false;
      if(angular.isString(attrs[n.showdownjs])){
        if(attrs[n.showdownjs] === "true" || attrs[n.showdownjs] === "" ){
          useShowdownjs = true;
        }
      }

      var repeatFoldername = false;
      if(angular.isString(attrs[n.repeatFoldername])){
        if(attrs[n.repeatFoldername] === "true" || attrs[n.repeatFoldername] === "" ){
          repeatFoldername = true;
        }
      }

      var noCache = false;
      if(angular.isString(attrs[n.noCache])){
        if(attrs[n.noCache] === "true" || attrs[n.noCache] === "" ){
          noCache = true;
        }
      }

      Postman.fromUrl(attrs[n.url]).then(
        function(res){
          var container = "";
          if(angular.isUndefined(attrs[n.template])){
            renderHTML(Postman.buildHTMLDoc(repeatFoldername, useShowdownjs));
          }
          else{
            scope.collection = Postman.getCollection();
            scope.folders = Postman.getFolders();
            scope.requests = Postman.getRequests();

            if(noCache){
              if(angular.isUndefined($templateCache.get(attrs[n.template]))){
                $http.get(attrs[n.template]).then(function (res) {
                  $templateCache.put(attrs[n.template], res.data );
                  renderCache();
                });
              }
              else{
                renderCache();
              }
            }
            else{
              $http.get(attrs[n.template]).then(function (res) {
                render(res.data);
              });
            }
          }
        }
      );
    }
  };
});

postman.directive('postmanCollectionFolders', function(Postman, $compile, $http, $q, $templateCache, $timeout, $anchorScroll, $sce, $location){

  var n = {
    url: "postmanCollectionFolders",
    href: "ref",
    noCache: "noCache"
  };

  var servicePostman = angular.copy(Postman);

  return {
    restrict: "A",
    link: function (scope, element, attrs){

      var render = function (c){
        element.append(c);
        scope.waitTillItsDone = false;
        $compile(element.contents())(scope);

        scope.waitTillItsDone = true;
      };

      var collection;

      var asyncFunction = function(resolve, reject){
        $http.get(attrs[n.url]).then(
          function(res){
            collection = angular.copy(res.data);
            resolve(res);
          },
          function(res){
            reject(res);
          }
        );
      }

      var _requests = [];

      var getRequests = function (){
        if(_requests.length > 0){
          return _requests;
        }
        var json = angular.fromJson(collection);
        _requests = json.requests;

        return _requests;
      }

     $q(asyncFunction,10).then(
       function(){
         var json = angular.fromJson(collection);
         var folders = json.folders;
         getRequests();

         if(folders && folders.length>0) {
           scope.showMe = {};
     	      folders.forEach(function(folder) {
                scope.showMe[folder.name] = false;
     		          folder.order.forEach(function(requestId) {
                    folder.uname = servicePostman.toUnderscore(folder.name);
     			          var req = servicePostman.getRequestWithId(_requests, requestId);
     			          if(req){
                        if(!angular.isArray(folder.requests)){
                          folder.requests = [];
                        }
                        req.uname = folder.uname+'-m-'+servicePostman.toUnderscore(req.name);
                        folder.requests.push(req);
                     }
     		          });
     	      });

            scope.folders = folders;

            scope.toggle = function(fName){
              scope.showMe[fName] = !scope.showMe[fName];
            }
            scope.getMethodPetName = function(txt){
              var ret = txt;
              if(angular.isString(txt)){
                switch (txt) {
                  case "DELETE":
                    ret = "DEL";
                    break;
                  case "delete":
                    ret = "del";
                    break;
                  default:
                }
              }
              return ret;
            }

             var html = '<div class="postman-collection-folders">';

             html += '<ul class="postman-folders" style="list-style-type: none; width: 100%;">';
             html += '<li class="postman-folder" ng-repeat="folder in folders" data-text="folder.name">';
             html += '<div ng-class="{\'active\': showMe[folder.name]}" data-ng-click="toggle(folder.name)" title="{{folder.name}}" '
             html += 'style="cursor: pointer; width: 100%; display: block; float: none;">';
             html += '<i ng-class="showMe[folder.name] ? \'icon-folder-open\' : \'icon-folder\'"></i> <span class="postman-folder-name">{{folder.name}}</span>';
             html += '</div>';

             html += '<ul class="postman-requests" data-ng-show="showMe[folder.name]" style="list-style-type: none; width: 100%;">';
             html += '<li class="postman-request" ng-repeat="r in folder.requests">', // highlight-on-anchor="r.uname" plus="50"
             html += '<div ng-class="r.method.toLowerCase()" class="method" style="display: block; float: none;"><span>{{getMethodPetName(r.method)}}</span></div>';

             html += '<div class="postman-request-name" style="display: block; float: none;">';

             var href = !angular.isUndefined(attrs[n.href]) ? attrs[n.href] : "";

             html += '<a data-ng-href="'+href+'#{{r.uname}}">{{r.name}}</a>';
             html += '</div>';
             html += '</li>';
             html += '</ul>';

             html += '</li></ul></div>';

             render(html);
         }
       }
     );
    }
  };
});
