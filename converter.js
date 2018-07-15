exports.convertKoki = function(koki){
	var hasil = []
	var kunci = []
	for(var i =0;i<koki.length;i++){
		kunci.push(koki[i])
		for(var j=i+1;j<koki.length;j++){
			if(koki[i].idKoki==koki[j].idKoki){
				kunci.push(koki[j])
				koki.splice(j,1)
			}
		}
		hasil.push(kunci)
		kunci = []	
	}
	return hasil
}
exports.convertOrder = function(order){
	var hasil = []
	for(var i =0;i<order.length;i++){
		var data = JSON.parse(order[i].data)
		for(var j=0;j<data.length;j++){
			hasil.push(data[j])
		}
	}
	return hasil
}