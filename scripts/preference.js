var storage = require('node-persist');
storage.initSync({
	dir : '../../../persist',
	encoding : 'utf8'
});
var preference = {
	load : function(key) {
		return storage.getItemSync(key);
	},
	save : function(key, value) {
		storage.setItemSync(key, value);
	}
};
module.exports = preference;