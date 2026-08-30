import json
import unittest

from zynalo_sdxl_spike.host_protocol import PROTOCOL, ProtocolValidationError, parse_command, validate_generate_payload, validate_load_model_payload


class HostProtocolTests(unittest.TestCase):
    @staticmethod
    def generation_request(**overrides):
        request = {
            "prompt": "test", "modelId": "model", "seed": 42, "width": 512, "height": 512,
            "steps": 5, "guidance": 7, "detailPass": {"enabled": False},
        }
        request.update(overrides)
        return request

    def test_parses_exact_command_envelope(self):
        command = parse_command(json.dumps({
            "protocol": PROTOCOL, "type": "command", "id": "cmd-1", "command": "status", "payload": {},
        }))
        self.assertEqual(command.name, "status")

    def test_rejects_malformed_and_unexpected_fields(self):
        with self.assertRaises(ProtocolValidationError):
            parse_command("not json")
        with self.assertRaises(ProtocolValidationError):
            parse_command(json.dumps({
                "protocol": PROTOCOL, "type": "command", "id": "cmd-1", "command": "status", "payload": {}, "extra": True,
            }))

    def test_validates_generation_payload(self):
        request = validate_generate_payload({"request": self.generation_request()}, "model")
        self.assertEqual(request["negativePrompt"], "")
        self.assertEqual(request["clipLayerSelection"], "penultimate-hidden-state")
        self.assertEqual(request["sampler"], "checkpoint-default")
        with self.assertRaises(ProtocolValidationError):
            validate_generate_payload({"request": {**request, "unknown": True}}, "model")
        with self.assertRaises(ProtocolValidationError):
            validate_generate_payload({"request": {**request, "clipLayerSelection": "fourth-from-last-hidden-state"}}, "model")
        with self.assertRaises(ProtocolValidationError):
            validate_generate_payload({"request": {**request, "sampler": "Euler a"}}, "model")

    def test_preserves_exact_prompt_whitespace(self):
        request = validate_generate_payload({"request": self.generation_request(
            prompt="  1girl, blue_eyes  ", negativePrompt="blurry ",
        )}, "model")
        self.assertEqual(request["prompt"], "  1girl, blue_eyes  ")
        self.assertEqual(request["negativePrompt"], "blurry ")

    def test_validates_resolved_lanczos_detail_pass(self):
        derived = (42 + 0x9E3779B9) & 0xFFFFFFFF
        detail = {
            "enabled": True, "upscaler": "lanczos", "scale": 1.5,
            "targetWidth": 768, "targetHeight": 768, "lockAspectRatio": True,
            "strength": 0.3, "steps": 12, "promptMode": "inherit",
            "negativePromptMode": "inherit", "seedMode": "derived", "seed": derived,
        }
        request = validate_generate_payload({"request": self.generation_request(detailPass=detail)}, "model")
        self.assertEqual(request["detailPass"]["seed"], derived)
        with self.assertRaises(ProtocolValidationError):
            validate_generate_payload({"request": self.generation_request(detailPass={**detail, "upscaler": "latent"})}, "model")
        with self.assertRaises(ProtocolValidationError):
            validate_generate_payload({"request": self.generation_request(detailPass={**detail, "seed": 1})}, "model")

    def test_preserves_custom_advanced_detail_values_and_rejects_unsafe_sizes(self):
        detail = {
            "enabled": True, "upscaler": "lanczos", "scale": 1.6,
            "targetWidth": 800, "targetHeight": 888, "lockAspectRatio": False,
            "strength": 0.35, "steps": 13, "promptMode": "custom", "prompt": "  detail prompt  ",
            "negativePromptMode": "custom", "negativePrompt": " detail negative ",
            "seedMode": "custom", "seed": 777,
        }
        request = validate_generate_payload({"request": self.generation_request(detailPass=detail)}, "model")
        self.assertEqual(request["detailPass"], detail)
        with self.assertRaises(ProtocolValidationError):
            validate_generate_payload({"request": self.generation_request(detailPass={**detail, "targetWidth": 802})}, "model")
        with self.assertRaises(ProtocolValidationError):
            validate_generate_payload({"request": self.generation_request(detailPass={**detail, "targetWidth": 3072, "targetHeight": 3072})}, "model")

    def test_validates_internal_model_reference(self):
        model = validate_load_model_payload({"model": {
            "id": "mdl_safe", "name": "Safe", "checkpoint": "C:\\Models\\safe.safetensors", "sha256": "a" * 64,
        }})
        self.assertEqual(model["id"], "mdl_safe")
        with self.assertRaises(ProtocolValidationError):
            validate_load_model_payload({"model": {**model, "checkpoint": "unsafe.ckpt"}})


if __name__ == "__main__":
    unittest.main()
