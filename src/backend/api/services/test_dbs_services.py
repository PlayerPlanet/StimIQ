"""
Test script for DBS state and tuning services.
Validates CSV parsing, schema types, and data format conversions.
Run from backend root: python api/services/test_dbs_services.py
"""

import sys
import json
from io import BytesIO
from datetime import date
from pathlib import Path
import importlib.util

# Add backend root to path for imports
backend_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_root))

# Load modules directly to avoid __init__.py circular dependencies
def load_module_from_file(name, filepath):
    spec = importlib.util.spec_from_file_location(name, filepath)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

# Load schemas first
dbs_state_schema_path = backend_root / "api" / "schemas" / "dbs_state.py"
dbs_state_schema = load_module_from_file("schemas_dbs_state", dbs_state_schema_path)

dbs_tuning_schema_path = backend_root / "api" / "schemas" / "dbs_tuning.py"
dbs_tuning_schema = load_module_from_file("schemas_dbs_tuning", dbs_tuning_schema_path)

# Load services
dbs_state_service_path = backend_root / "api" / "services" / "dbs_state.py"
dbs_state_service = load_module_from_file("services_dbs_state", dbs_state_service_path)

dbs_tuning_service_path = backend_root / "api" / "services" / "dbs_tuning.py"
dbs_tuning_service = load_module_from_file("services_dbs_tuning", dbs_tuning_service_path)

# Extract what we need
_parse_latest_params = dbs_state_service._parse_latest_params
_channels_to_programming_dict = dbs_state_service._channels_to_programming_dict
get_mock_state_for_patient = dbs_state_service.get_mock_state_for_patient
get_mock_tuning_recommendation = dbs_tuning_service.get_mock_tuning_recommendation
_bayes_params_to_programming_dict = dbs_tuning_service._bayes_params_to_programming_dict

ChannelState = dbs_state_schema.ChannelState
DbsState = dbs_state_schema.DbsState
ChannelRecommendation = dbs_tuning_schema.ChannelRecommendation
DbsTuningRecommendation = dbs_tuning_schema.DbsTuningRecommendation


def test_csv_parsing():
    """Test CSV parsing with various formats."""
    print("\n" + "="*60)
    print("TEST 1: CSV Parsing")
    print("="*60)
    
    # Test 1a: Standard CSV with comma delimiter
    csv_data = "2.5,130.0,0.06,0.0,2.3,130.0,0.06,0.0,2.7,130.0,0.06,0.0,2.4,130.0,0.06,0.0"
    content = csv_data.encode("utf-8")
    try:
        params = _parse_latest_params(content, max_params=16)
        assert len(params) == 16, f"Expected 16 params, got {len(params)}"
        assert isinstance(params[0], float), f"Expected float, got {type(params[0])}"
        assert params[0] == 2.5, f"Expected 2.5, got {params[0]}"
        print("✓ Test 1a PASSED: Standard CSV parsing")
    except Exception as e:
        print(f"✗ Test 1a FAILED: {e}")
        return False
    
    # Test 1b: CSV with header row (should be skipped)
    csv_with_header = "amp1,freq1,pw1,phi1,amp2,freq2,pw2,phi2,amp3,freq3,pw3,phi3,amp4,freq4,pw4,phi4\n2.5,130.0,0.06,0.0,2.3,130.0,0.06,0.0,2.7,130.0,0.06,0.0,2.4,130.0,0.06,0.0"
    content = csv_with_header.encode("utf-8")
    try:
        params = _parse_latest_params(content, max_params=16)
        assert len(params) == 16, f"Expected 16 params, got {len(params)}"
        assert params[0] == 2.5, f"Expected 2.5, got {params[0]}"
        print("✓ Test 1b PASSED: CSV with header row")
    except Exception as e:
        print(f"✗ Test 1b FAILED: {e}")
        return False
    
    # Test 1c: Semicolon-delimited CSV (fallback format)
    csv_semicolon = "2.5;130.0;0.06;0.0;2.3;130.0;0.06;0.0;2.7;130.0;0.06;0.0;2.4;130.0;0.06;0.0"
    content = csv_semicolon.encode("utf-8")
    try:
        params = _parse_latest_params(content, max_params=16)
        assert len(params) == 16, f"Expected 16 params, got {len(params)}"
        assert params[0] == 2.5, f"Expected 2.5, got {params[0]}"
        print("✓ Test 1c PASSED: Semicolon-delimited CSV")
    except Exception as e:
        print(f"✗ Test 1c FAILED: {e}")
        return False
    
    # Test 1d: Multi-row CSV (should use last row)
    csv_multirow = "1.0,100.0,0.05,0.0,1.1,100.0,0.05,0.0,1.2,100.0,0.05,0.0,1.3,100.0,0.05,0.0\n2.5,130.0,0.06,0.0,2.3,130.0,0.06,0.0,2.7,130.0,0.06,0.0,2.4,130.0,0.06,0.0"
    content = csv_multirow.encode("utf-8")
    try:
        params = _parse_latest_params(content, max_params=16)
        assert len(params) == 16, f"Expected 16 params, got {len(params)}"
        assert params[0] == 2.5, f"Expected 2.5 (last row), got {params[0]}"
        print("✓ Test 1d PASSED: Multi-row CSV (uses last row)")
    except Exception as e:
        print(f"✗ Test 1d FAILED: {e}")
        return False
    
    return True


def test_channel_schema():
    """Test ChannelState schema validation."""
    print("\n" + "="*60)
    print("TEST 2: ChannelState Schema")
    print("="*60)
    
    try:
        ch = ChannelState(
            channel_id=1,
            amplitude=2.5,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        )
        assert ch.channel_id == 1, "channel_id mismatch"
        assert isinstance(ch.amplitude, float), f"amplitude should be float, got {type(ch.amplitude)}"
        assert isinstance(ch.frequency, float), f"frequency should be float, got {type(ch.frequency)}"
        assert isinstance(ch.pulse_width_s, float), f"pulse_width_s should be float, got {type(ch.pulse_width_s)}"
        assert isinstance(ch.phase_rad, float), f"phase_rad should be float, got {type(ch.phase_rad)}"
        print("✓ Test 2 PASSED: ChannelState schema validated")
        return True
    except Exception as e:
        print(f"✗ Test 2 FAILED: {e}")
        return False


def test_mock_dbs_state():
    """Test mock DBS state generation."""
    print("\n" + "="*60)
    print("TEST 3: Mock DBS State")
    print("="*60)
    
    try:
        state = get_mock_state_for_patient("test-patient-123")
        
        # Validate schema
        assert isinstance(state, DbsState), f"Expected DbsState, got {type(state)}"
        assert state.patient_id == "test-patient-123", "patient_id mismatch"
        assert len(state.channels) == 8, f"Expected 8 channels, got {len(state.channels)}"
        
        # Validate channels
        for ch in state.channels:
            assert isinstance(ch, ChannelState), f"Expected ChannelState, got {type(ch)}"
            assert isinstance(ch.channel_id, int), "channel_id should be int"
            assert isinstance(ch.amplitude, float), "amplitude should be float"
            assert isinstance(ch.frequency, float), "frequency should be float"
            assert isinstance(ch.pulse_width_s, float), "pulse_width_s should be float"
            assert isinstance(ch.phase_rad, float), "phase_rad should be float"
            assert ch.amplitude > 0, "amplitude should be positive"
            assert ch.frequency > 0, "frequency should be positive"
        
        # Validate timeseries
        assert len(state.tremor_timeseries) > 0, "tremor_timeseries should not be empty"
        assert len(state.prom_timeseries) > 0, "prom_timeseries should not be empty"
        assert isinstance(state.tremor_timeseries[0].date, date), "tremor date should be date type"
        assert isinstance(state.tremor_timeseries[0].avg_tremor_activity, float), "tremor_activity should be float"
        
        print("✓ Test 3 PASSED: Mock DBS state generated correctly")
        print(f"  - 8 channels with valid parameters")
        print(f"  - {len(state.tremor_timeseries)} tremor data points")
        print(f"  - {len(state.prom_timeseries)} PROM data points")
        return True
    except Exception as e:
        print(f"✗ Test 3 FAILED: {e}")
        return False


def test_bayes_params_conversion():
    """Test conversion of Bayes params to programming dict."""
    print("\n" + "="*60)
    print("TEST 4: Bayes Parameters Conversion")
    print("="*60)
    
    try:
        # Simulate Bayes output with 4 channels
        bayes_params = {
            "amp_0": 2.5,
            "freq_hz_0": 130.0,
            "pulse_width_s_0": 0.06,
            "phase_rad_0": 0.0,
            "amp_1": 2.3,
            "freq_hz_1": 130.0,
            "pulse_width_s_1": 0.06,
            "phase_rad_1": 0.0,
            "amp_2": 2.7,
            "freq_hz_2": 130.0,
            "pulse_width_s_2": 0.06,
            "phase_rad_2": 0.0,
            "amp_3": 2.4,
            "freq_hz_3": 130.0,
            "pulse_width_s_3": 0.06,
            "phase_rad_3": 0.0,
        }
        
        programming_dict = _bayes_params_to_programming_dict(bayes_params)
        
        # Validate structure
        assert "channels" in programming_dict, "Should have 'channels' key"
        assert len(programming_dict["channels"]) == 4, f"Expected 4 channels, got {len(programming_dict['channels'])}"
        
        # Validate first channel
        ch0 = programming_dict["channels"][0]
        assert ch0["channel_id"] == 1, f"Expected channel_id=1, got {ch0['channel_id']}"
        assert ch0["amplitude"] == 2.5, f"Expected amplitude=2.5, got {ch0['amplitude']}"
        assert ch0["frequency"] == 130.0, f"Expected frequency=130.0, got {ch0['frequency']}"
        assert isinstance(ch0["amplitude"], float), "amplitude should be float"
        assert isinstance(ch0["frequency"], float), "frequency should be float"
        assert isinstance(ch0["pulse_width_s"], float), "pulse_width_s should be float"
        assert isinstance(ch0["phase_rad"], float), "phase_rad should be float"
        
        # Validate all channels have required fields
        for i, ch in enumerate(programming_dict["channels"]):
            assert "channel_id" in ch, f"Channel {i} missing channel_id"
            assert "amplitude" in ch, f"Channel {i} missing amplitude"
            assert "frequency" in ch, f"Channel {i} missing frequency"
            assert "pulse_width_s" in ch, f"Channel {i} missing pulse_width_s"
            assert "phase_rad" in ch, f"Channel {i} missing phase_rad"
        
        print("✓ Test 4 PASSED: Bayes params converted correctly")
        print(f"  - 4 channels extracted from flattened parameters")
        print(f"  - All required fields present")
        print(f"  - Data types validated")
        return True
    except Exception as e:
        print(f"✗ Test 4 FAILED: {e}")
        return False


def test_mock_tuning_recommendation():
    """Test mock tuning recommendation schema."""
    print("\n" + "="*60)
    print("TEST 5: Mock Tuning Recommendation Schema")
    print("="*60)
    
    try:
        rec = get_mock_tuning_recommendation("test-patient-456")
        
        # Validate schema
        assert isinstance(rec, DbsTuningRecommendation), f"Expected DbsTuningRecommendation, got {type(rec)}"
        assert rec.patient_id == "test-patient-456", "patient_id mismatch"
        assert len(rec.recommended_parameters) == 8, f"Expected 8 channels, got {len(rec.recommended_parameters)}"
        assert len(rec.explanations) > 0, "Should have explanations"
        
        # Validate each recommendation
        for i, ch_rec in enumerate(rec.recommended_parameters):
            assert isinstance(ch_rec, ChannelRecommendation), f"Channel {i} should be ChannelRecommendation"
            assert isinstance(ch_rec.channel_id, int), f"Channel {i} channel_id should be int"
            assert isinstance(ch_rec.amplitude, float), f"Channel {i} amplitude should be float"
            assert isinstance(ch_rec.frequency, float), f"Channel {i} frequency should be float"
            assert isinstance(ch_rec.pulse_width_s, float), f"Channel {i} pulse_width_s should be float"
            assert isinstance(ch_rec.phase_rad, float), f"Channel {i} phase_rad should be float"
        
        # Validate explanations
        for exp in rec.explanations:
            assert isinstance(exp, str), f"Explanation should be str, got {type(exp)}"
            assert len(exp) > 0, "Explanation should not be empty"
        
        print("✓ Test 5 PASSED: Mock tuning recommendation validated")
        print(f"  - 8 recommendation channels with valid parameters")
        print(f"  - {len(rec.explanations)} explanations provided")
        return True
    except Exception as e:
        print(f"✗ Test 5 FAILED: {e}")
        return False


def run_all_tests():
    """Run all tests and report results."""
    print("\n" + "="*60)
    print("DBS SERVICES TEST SUITE")
    print("="*60)
    
    tests = [
        ("CSV Parsing", test_csv_parsing),
        ("Channel Schema", test_channel_schema),
        ("Mock DBS State", test_mock_dbs_state),
        ("Bayes Params Conversion", test_bayes_params_conversion),
        ("Mock Tuning Recommendation", test_mock_tuning_recommendation),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            passed = test_func()
            results.append((test_name, passed))
        except Exception as e:
            print(f"\n✗ {test_name} CRASHED: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n✓ ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n✗ {total_count - passed_count} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
