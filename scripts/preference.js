var storage = require('node-persist');
storage.initSync({
	dir : 'preference',
	encoding : 'utf8'
});
var preference = {
	save : function(key) {
		storage.getItem(key);
	},
	load : function(key, value) {
		storage.setItem(key, value);
	}
};
module.exports = preference;