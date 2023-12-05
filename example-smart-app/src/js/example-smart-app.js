var bp_loinc_cd = "85354-9";
var sys_loinc_cd = "8480-6";
var dia_loinc_cd = "8462-4";
var btemp_loinc_cd = "8310-5";
(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: [
						'http://loinc.org|8302-2'				// body height
						//, 'http://loinc.org|8462-4'			// Diastolic BP
						//, 'http://loinc.org|8480-6'			// Systolic BP
						, 'http://loinc.org|2085-9'				// Cholesterol in HDL
						, 'http://loinc.org|2089-1'				// Cholesterol in LDL
						, 'http://loinc.org|'+bp_loinc_cd		// BP Systolic and Diastolic, changed from 55284-4
						, 'http://loinc.org|'+btemp_loinc_cd	// 001 Body Temperature
						]}
					, "date": 'gt2020-01-01'				// 002
					, "category": 'vital-signs'				// 002
                    }
                  });

		var alg = smart.patient.api.fetchAll ({
			type: 'AllergyIntolerance',
			query: {
				"clinical-status": 'active'
			}
		});

        $.when(pt, obv, alg).fail(onError);

        $.when(pt, obv, alg).done(function(patient, obv, alg) {
			console.log(alg)
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family;
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes(bp_loinc_cd),sys_loinc_cd);
          var diastolicbp = getBloodPressureValue(byCodes(bp_loinc_cd),dia_loinc_cd);
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');
		  var temp = byCodes(btemp_loinc_cd);	//001

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);
		  
          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
			
		  p.temp = getQuantityValueAndUnit(temp[0]);	//001
		  
		  p.allergies = getAllergies(alg);	//002

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
	  temp: {value: ''},	//001
	  allergies: {value: ''}	//002 
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }
  
  // 002
  function getAllergies(a) {
	 var allergies = "";
	for(let i = 0; i < a.length; i++) {
		allergies += a[i].code.text + "<br>";
	}
	return allergies;
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
	$('#temp').html(p.temp);	//001
	$('#alg_name').html(p.allergies);	//002
  };

})(window);
