# Worked example: a strongly typed workflow-graph domain in Python

> This is one concrete application of the `domain-modeling` skill: Python with Pydantic, for a graph/workflow domain (nodes, ports, typed connections, executors). It is an example, not the rule. The language-neutral principles live in `../SKILL.md`; translate the mechanics here to your language and domain (see the mapping table there).

# Original write-up

## Purpose

Use this skill when implementing a domain modeled Python codebase where
correctness, explicit contracts, IDE support, runtime validation, and
maintainability matter.

The goal is to produce code that is:

-   strongly typed
-   domain-oriented
-   explicit about valid states
-   validated at runtime where external/untrusted data enters the system
-   statically checkable with `mypy` or `pyright`
-   easy to navigate in an IDE
-   difficult to misuse accidentally
-   structured so that domain contracts have a single source of truth
-   suitable for APIs, workflow engines, pipeline systems, orchestration
    systems, and other non-trivial applications

This skill is especially important for graph/workflow/pipeline domains
containing nodes, ports, typed connections, executors, runtime values,
validation, and graph-level invariants.

------------------------------------------------------------------------

# 1. Core Principles

## 1.1 Model the domain, not the storage format

Do not let JSON dictionaries, database rows, or generic strings become
the primary domain model.

Bad:

``` python
node = {
    "type": "generate_image",
    "id": "node-1",
    "config": {
        "model": "flux",
    },
}
```

Better:

``` python
class GenerateImageNode(BaseModel):
    id: str
    type: Literal["generate_image"]
    model: str
```

The domain model should express what the object actually is.

------------------------------------------------------------------------

## 1.2 Prefer explicit types over stringly typed APIs

Bad:

``` python
def execute(node_type: str, input_type: str) -> str:
    ...
```

Good:

``` python
def execute(
    node: GenerateImageNode,
    prompt: Text,
) -> Image:
    ...
```

A string such as `"image"` is not a substitute for the `Image` type when
the application needs compile-time guarantees.

Use strings only when they are genuinely identifiers or wire-format
values.

------------------------------------------------------------------------

## 1.3 Separate three concepts

Do not conflate:

1.  **Domain type**
2.  **Port contract**
3.  **Runtime value**

For example:

``` text
Image
  = runtime/domain value

OutputPort[Image]
  = contract saying "this port produces Image"

InputPort[Image]
  = contract saying "this port accepts Image"
```

These are different abstractions.

------------------------------------------------------------------------

# 2. Type the Domain Values

Use explicit domain classes.

``` python
from pydantic import BaseModel
from typing import Literal


class Text(BaseModel):
    kind: Literal["text"] = "text"
    value: str


class Image(BaseModel):
    kind: Literal["image"] = "image"
    uri: str


class Video(BaseModel):
    kind: Literal["video"] = "video"
    uri: str


class Audio(BaseModel):
    kind: Literal["audio"] = "audio"
    uri: str
```

These classes represent runtime values.

They should not merely be aliases:

``` python
# Avoid when the domain needs semantic distinction.
Image = str
Text = str
Video = str
```

Otherwise this becomes legal:

``` python
image: Image = "hello"
```

and the type system cannot distinguish the concepts.

------------------------------------------------------------------------

# 3. Use Literal Discriminators for Polymorphic Runtime Values

When multiple domain values cross an API/storage boundary, use a
discriminator.

``` python
from typing import Annotated
from pydantic import BaseModel, Field
from typing import Literal


class Text(BaseModel):
    kind: Literal["text"] = "text"
    value: str


class Image(BaseModel):
    kind: Literal["image"] = "image"
    uri: str


class Video(BaseModel):
    kind: Literal["video"] = "video"
    uri: str


class Audio(BaseModel):
    kind: Literal["audio"] = "audio"
    uri: str


RuntimeValue = Annotated[
    Text | Image | Video | Audio,
    Field(discriminator="kind"),
]
```

This gives Pydantic an explicit way to parse:

``` json
{
  "kind": "image",
  "uri": "gs://bucket/image.png"
}
```

into `Image`.

Do not use arbitrary runtime inspection when a stable discriminator can
express the union.

------------------------------------------------------------------------

# 4. Use Generics for Port Contracts

A port should describe the value type it accepts or produces.

``` python
from dataclasses import dataclass
from typing import Generic, TypeVar


T = TypeVar("T")


@dataclass(frozen=True)
class InputPort(Generic[T]):
    name: str
    type_id: str


@dataclass(frozen=True)
class OutputPort(Generic[T]):
    name: str
    type_id: str
```

Example:

``` python
prompt_port: InputPort[Text] = InputPort(
    name="prompt",
    type_id="text",
)

image_port: OutputPort[Image] = OutputPort(
    name="image",
    type_id="image",
)
```

The generic parameter provides static information.

The runtime `type_id` provides runtime information.

------------------------------------------------------------------------

# 5. Do Not Assume Python Generics Exist at Runtime

This is a critical rule.

This:

``` python
InputPort[Image]
```

is useful to static type checkers, but the generic parameter should not
be treated as your runtime validation mechanism.

Do not write logic that assumes you can reliably recover `Image` from an
arbitrary instance of:

``` python
InputPort[Image]
```

at runtime.

Instead, keep an explicit runtime descriptor:

``` python
@dataclass(frozen=True)
class PortType:
    type_id: str
    python_type: type


IMAGE_TYPE = PortType(
    type_id="image",
    python_type=Image,
)
```

Then:

``` python
@dataclass(frozen=True)
class InputPort(Generic[T]):
    name: str
    port_type: PortType
```

Static typing:

``` python
InputPort[Image]
```

Runtime typing:

``` python
port.port_type.python_type
```

These serve different purposes.

------------------------------------------------------------------------

# 6. Prefer a Stable Port Type Registry

For larger systems, centralize runtime type metadata.

``` python
TYPE_REGISTRY: dict[str, type[RuntimeValue]] = {
    "text": Text,
    "image": Image,
    "video": Video,
    "audio": Audio,
}
```

However, if using `type[RuntimeValue]` creates checker limitations, a
common base class is often cleaner:

``` python
class Artifact(BaseModel):
    pass


class Text(Artifact):
    kind: Literal["text"] = "text"
    value: str


class Image(Artifact):
    kind: Literal["image"] = "image"
    uri: str
```

Then:

``` python
TYPE_REGISTRY: dict[str, type[Artifact]] = {
    "text": Text,
    "image": Image,
}
```

Use stable wire identifiers such as:

``` text
text
image
video
audio
```

Do not use Python class names as persistent API identifiers:

``` python
# Avoid
"GenerateImageNode"

# Prefer
"generate_image"
```

Python class names may change during refactoring; wire identifiers are
part of the domain/API contract.

------------------------------------------------------------------------

# 7. Model Nodes as Explicit Types

Do not create one giant model with arbitrary dictionaries.

Bad:

``` python
class Node(BaseModel):
    id: str
    type: str
    config: dict[str, object]
```

This permits invalid states such as:

``` python
Node(
    id="x",
    type="generate_image",
    config={"scale": "banana"},
)
```

Prefer specific node models.

``` python
class Node(BaseModel):
    id: str


class GenerateImageNode(Node):
    type: Literal["generate_image"] = "generate_image"
    model: str


class UpscaleNode(Node):
    type: Literal["upscale"] = "upscale"
    scale: int
```

------------------------------------------------------------------------

# 8. Use Discriminated Unions for Node Collections

When a workflow contains different node types:

``` python
from typing import Annotated
from pydantic import Field


Node = Annotated[
    GenerateImageNode | UpscaleNode,
    Field(discriminator="type"),
]
```

Then:

``` python
class WorkflowDefinition(BaseModel):
    nodes: list[Node]
```

The serialized form can be:

``` json
{
  "nodes": [
    {
      "id": "generate",
      "type": "generate_image",
      "model": "flux"
    },
    {
      "id": "upscale",
      "type": "upscale",
      "scale": 2
    }
  ]
}
```

Pydantic selects the correct concrete model using `type`.

------------------------------------------------------------------------

# 9. Ports Are Part of the Node Contract

Each node should explicitly expose its input and output ports.

Example:

``` python
class GenerateImageNode(Node):
    type: Literal["generate_image"] = "generate_image"
    model: str

    def input_ports(self) -> dict[str, InputPort[Text]]:
        return {
            "prompt": InputPort(
                name="prompt",
                port_type=TEXT_TYPE,
            )
        }

    def output_ports(self) -> dict[str, OutputPort[Image]]:
        return {
            "image": OutputPort(
                name="image",
                port_type=IMAGE_TYPE,
            )
        }
```

And:

``` python
class UpscaleNode(Node):
    type: Literal["upscale"] = "upscale"
    scale: int

    def input_ports(self) -> dict[str, InputPort[Image]]:
        return {
            "image": InputPort(
                name="image",
                port_type=IMAGE_TYPE,
            )
        }

    def output_ports(self) -> dict[str, OutputPort[Image]]:
        return {
            "image": OutputPort(
                name="image",
                port_type=IMAGE_TYPE,
            )
        }
```

The node contract should answer:

-   What inputs exist?
-   What are their names?
-   What types do they accept?
-   What outputs exist?
-   What types do they produce?

------------------------------------------------------------------------

# 10. Connections Must Reference Ports, Not Just Nodes

A connection should identify both endpoints.

``` python
class Connection(BaseModel):
    source_node: str
    source_port: str
    target_node: str
    target_port: str
```

Example:

``` python
Connection(
    source_node="generate",
    source_port="image",
    target_node="upscale",
    target_port="image",
)
```

Avoid:

``` python
Connection(
    source="generate",
    target="upscale",
)
```

because the latter loses port-level semantics.

------------------------------------------------------------------------

# 11. Validate Connection Type Compatibility

A graph connection is valid only if:

``` text
source output type == target input type
```

For example:

``` text
GenerateImage.image : Image
        |
        v
Upscale.image : Image

VALID
```

But:

``` text
GenerateImage.image : Image
        |
        v
GenerateAudio.prompt : Text

INVALID
```

A graph validator should report:

``` text
Type mismatch:
generate.image produces Image,
but audio.prompt expects Text.
```

Do not rely only on Python's static type checker because connections
usually originate from runtime graph definitions.

------------------------------------------------------------------------

# 12. Graph Validation Is Different From Model Validation

Pydantic can validate:

``` python
scale: int
```

But it cannot infer all graph-level invariants from individual fields.

Graph validation should separately check:

1.  referenced node exists
2.  source port exists
3.  target port exists
4.  source and target types are compatible
5.  duplicate connections are rejected if the domain disallows them
6.  required inputs are satisfied
7.  graph cycle constraints are satisfied
8.  node-specific graph constraints are satisfied

Keep these checks explicit.

------------------------------------------------------------------------

# 13. Cycle Detection Must Report the Full Cycle Path

Never report only:

``` text
Cycle detected.
```

That is not useful in a graph editor.

For:

``` text
A -> B
B -> C
C -> A
```

report:

``` text
Cycle detected: A -> B -> C -> A
```

Use DFS with:

-   `state`
-   current DFS path
-   node-to-path-index mapping

Example:

``` python
from collections import defaultdict


def find_cycle(
    workflow: WorkflowDefinition,
) -> tuple[list[str], int] | None:

    adjacency: dict[str, list[tuple[str, int]]] = defaultdict(list)

    for index, connection in enumerate(workflow.connections):
        adjacency[connection.source_node].append(
            (connection.target_node, index)
        )

    # 0 = unvisited
    # 1 = currently in DFS stack
    # 2 = completely processed
    state = {
        node.id: 0
        for node in workflow.nodes
    }

    path: list[str] = []
    path_index: dict[str, int] = {}

    def dfs(node_id: str) -> tuple[list[str], int] | None:
        state[node_id] = 1
        path_index[node_id] = len(path)
        path.append(node_id)

        for target_id, connection_index in adjacency[node_id]:

            if state[target_id] == 1:
                start = path_index[target_id]

                cycle = path[start:] + [target_id]

                return cycle, connection_index

            if state[target_id] == 0:
                result = dfs(target_id)

                if result is not None:
                    return result

        path.pop()
        path_index.pop(node_id)
        state[node_id] = 2

        return None

    for node_id in state:
        if state[node_id] == 0:
            result = dfs(node_id)

            if result is not None:
                return result

    return None
```

For:

``` text
A -> B -> C -> A
```

this returns:

``` python
(["A", "B", "C", "A"], offending_connection_index)
```

------------------------------------------------------------------------

# 14. Pydantic Graph Errors Must Have Useful Locations

Do not raise a generic exception:

``` python
raise ValueError("Cycle detected")
```

This loses structured validation information.

Instead, raise a Pydantic `ValidationError` with a location.

``` python
from pydantic import ValidationError


raise ValidationError.from_exception_data(
    title="WorkflowDefinition",
    line_errors=[
        {
            "type": "value_error",
            "loc": (
                "connections",
                connection_index,
            ),
            "input": connection.model_dump(),
            "ctx": {
                "error": (
                    f"Cycle detected: {cycle_path}"
                )
            },
        }
    ],
)
```

For connection 2:

``` text
connections.2
```

is much better than:

``` text
WorkflowDefinition
```

because the caller can identify the offending graph element.

------------------------------------------------------------------------

# 15. Include the Edge That Closes the Cycle

The most useful cycle error includes both the path and the offending
edge.

``` python
cycle_path = " -> ".join(cycle)

message = (
    f"Cycle detected: {cycle_path}. "
    f"Connection "
    f"{connection.source_node}.{connection.source_port} "
    f"-> "
    f"{connection.target_node}.{connection.target_port} "
    f"closes the cycle."
)
```

Example:

``` text
connections.2

Cycle detected: A -> B -> C -> A.
Connection C.image -> A.image closes the cycle.
```

This is appropriate for APIs and workflow editors.

------------------------------------------------------------------------

# 16. Keep Graph Algorithms Independent From Pydantic

Prefer:

``` text
graph algorithm
      |
      v
structured graph result
      |
      v
Pydantic adapter
      |
      v
ValidationError
```

Do not tightly couple DFS to Pydantic.

Good:

``` python
result = find_cycle(workflow)

if result:
    cycle, connection_index = result
```

Then:

``` python
raise ValidationError.from_exception_data(...)
```

This keeps graph logic reusable in:

-   execution engines
-   CLI validation
-   tests
-   workflow editors
-   API validation
-   static analyzers

------------------------------------------------------------------------

# 17. Executor Contracts Must Be Strongly Typed

Each executor should have an explicit input/output contract.

Using `Protocol`:

``` python
from typing import Protocol


class GenerateImageExecutor(Protocol):
    def __call__(
        self,
        node: GenerateImageNode,
        prompt: Text,
    ) -> Image:
        ...
```

``` python
class UpscaleExecutor(Protocol):
    def __call__(
        self,
        node: UpscaleNode,
        image: Image,
    ) -> Image:
        ...
```

``` python
class GenerateVideoExecutor(Protocol):
    def __call__(
        self,
        node: GenerateVideoNode,
        prompt: Text,
    ) -> Video:
        ...
```

``` python
class GenerateAudioExecutor(Protocol):
    def __call__(
        self,
        node: GenerateAudioNode,
        prompt: Text,
    ) -> Audio:
        ...
```

This prevents accidental executor implementations such as:

``` python
def execute(
    node: UpscaleNode,
    image: Text,  # WRONG
) -> Audio:
    ...
```

------------------------------------------------------------------------

# 18. Executor Return Types Must Match Node Output Contracts

If:

``` text
UpscaleNode.image -> Image
```

then:

``` python
def execute(
    node: UpscaleNode,
    image: Image,
) -> Image:
    ...
```

not:

``` python
def execute(
    node: UpscaleNode,
    image: Image,
) -> object:
    ...
```

and not:

``` python
def execute(
    node: UpscaleNode,
    image: Image,
) -> RuntimeValue:
    ...
```

unless the public abstraction genuinely requires that wider return type.

Use the narrowest correct type.

------------------------------------------------------------------------

# 19. Do Not Duplicate Port Contracts Unnecessarily

There should be one canonical domain contract.

Avoid having these independently define different types:

``` python
class UpscaleNode:
    # says Image -> Image
```

and:

``` python
class UpscaleExecutor:
    # says Text -> Video
```

and:

``` python
UI_SCHEMA = {
    # says Image -> Audio
}
```

These can drift.

The desired architecture is:

``` text
                Node contract
                     |
        +------------+------------+
        |            |            |
        v            v            v
     graph        executor       UI
   validation     dispatch      schema
```

The node/port specification is the domain source of truth.

------------------------------------------------------------------------

# 20. TypedDict Is Useful for Named Executor Inputs

When ports have meaningful names and executor implementations should
receive multiple named inputs, `TypedDict` is often better than:

``` python
dict[str, RuntimeValue]
```

Example:

``` python
from typing import TypedDict


class GenerateImageInputs(TypedDict):
    prompt: Text


class GenerateImageOutputs(TypedDict):
    image: Image
```

Then:

``` python
class GenerateImageExecutor(Protocol):
    def __call__(
        self,
        node: GenerateImageNode,
        inputs: GenerateImageInputs,
    ) -> GenerateImageOutputs:
        ...
```

This gives IDE autocomplete:

``` python
inputs["prompt"]
```

and catches:

``` python
inputs["image"]  # static error
```

Use `TypedDict` when named fields are part of the contract.

------------------------------------------------------------------------

# 21. Avoid Generic `dict[str, ...]` When the Keys Are Known

Bad:

``` python
inputs: dict[str, RuntimeValue]
```

This loses the relationship between:

``` text
"prompt" -> Text
```

and:

``` text
"image" -> Image
```

Better:

``` python
class UpscaleInputs(TypedDict):
    image: Image
```

Better still when there are outputs:

``` python
class UpscaleOutputs(TypedDict):
    image: Image
```

Then:

``` python
def execute(
    node: UpscaleNode,
    inputs: UpscaleInputs,
) -> UpscaleOutputs:
    ...
```

------------------------------------------------------------------------

# 22. Static Typing and Runtime Validation Solve Different Problems

Use static typing for developer correctness:

``` python
def upscale(image: Image) -> Image:
    ...
```

Use runtime validation for external data:

``` text
JSON
  |
  v
Pydantic
  |
  v
validated domain model
```

Do not expect mypy/pyright to validate data received from:

-   HTTP requests
-   databases
-   message queues
-   user-created workflows
-   JSON
-   YAML
-   external services

And do not use runtime validation as a substitute for good static types
inside application code.

------------------------------------------------------------------------

# 23. Executor Registry

A registry should provide runtime dispatch while preserving static type
information at the API boundary.

Example:

``` python
from typing import overload


class ExecutorRegistry:

    def __init__(
        self,
        generate_image: GenerateImageExecutor,
        upscale: UpscaleExecutor,
        generate_video: GenerateVideoExecutor,
        generate_audio: GenerateAudioExecutor,
    ) -> None:
        self.generate_image = generate_image
        self.upscale = upscale
        self.generate_video = generate_video
        self.generate_audio = generate_audio

    @overload
    def execute(
        self,
        node: GenerateImageNode,
        inputs: GenerateImageInputs,
    ) -> GenerateImageOutputs:
        ...

    @overload
    def execute(
        self,
        node: UpscaleNode,
        inputs: UpscaleInputs,
    ) -> UpscaleOutputs:
        ...

    @overload
    def execute(
        self,
        node: GenerateVideoNode,
        inputs: GenerateVideoInputs,
    ) -> GenerateVideoOutputs:
        ...

    @overload
    def execute(
        self,
        node: GenerateAudioNode,
        inputs: GenerateAudioInputs,
    ) -> GenerateAudioOutputs:
        ...

    def execute(
        self,
        node: Node,
        inputs: object,
    ) -> object:
        if isinstance(node, GenerateImageNode):
            return self.generate_image(node, inputs)

        if isinstance(node, UpscaleNode):
            return self.upscale(node, inputs)

        if isinstance(node, GenerateVideoNode):
            return self.generate_video(node, inputs)

        if isinstance(node, GenerateAudioNode):
            return self.generate_audio(node, inputs)

        raise TypeError(
            f"Unsupported node type: {type(node).__name__}"
        )
```

The overloads provide a typed public interface.

The implementation can use runtime dispatch.

------------------------------------------------------------------------

# 24. Never Let the Runtime Registry Become the Domain Model

Avoid:

``` python
EXECUTORS = {
    "generate_image": GenerateImageExecutor,
    "upscale": UpscaleExecutor,
}
```

as the only source of truth.

A string registry alone loses:

-   node type
-   input types
-   output types
-   port metadata
-   configuration schema

A better long-term architecture is a node specification:

``` python
NodeSpec
    |
    +-- node type
    +-- input ports
    +-- output ports
    +-- executor
    +-- validation metadata
```

------------------------------------------------------------------------

# 25. Preferred Single-Source-of-Truth Architecture

For a mature workflow engine, aim toward:

``` python
@dataclass(frozen=True)
class NodeSpec[NodeT]:
    type_id: str
    input_ports: ...
    output_ports: ...
    executor: ...
```

Conceptually:

``` text
NodeSpec
   |
   +--> Pydantic parsing
   |
   +--> graph validation
   |
   +--> runtime input validation
   |
   +--> executor dispatch
   |
   +--> UI schema
   |
   +--> serialization
```

Do not make every layer independently define the same node.

------------------------------------------------------------------------

# 26. But Do Not Over-Abstract Too Early

Strong typing does not mean creating an abstraction for every line.

Bad overengineering:

``` python
AbstractTypedPortFactoryProvider
AbstractNodeExecutionContractResolver
AbstractRuntimeTypeMetadataAdapter
```

when the domain only has three node types.

Start with:

``` text
Node
Port
Connection
WorkflowDefinition
Executor
```

Add abstractions when repeated domain structure is real.

------------------------------------------------------------------------

# 27. Validation Ordering

Validate in a deterministic order.

Recommended:

``` text
1. Pydantic field validation
2. Node references
3. Port existence
4. Port type compatibility
5. Connection constraints
6. Required inputs
7. Graph topology
8. Graph cycles
9. Domain-specific graph invariants
```

This produces more useful errors.

Do not report:

``` text
Cycle detected
```

before reporting that a referenced node does not exist if the graph is
structurally invalid.

------------------------------------------------------------------------

# 28. Collect Multiple Graph Errors

Do not stop at the first independent graph problem when the API can
provide a useful batch of errors.

Represent graph errors structurally:

``` python
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GraphError:
    loc: tuple[str | int, ...]
    message: str
    input: Any
```

Examples:

``` python
GraphError(
    loc=("connections", 2),
    message="Cycle detected: A -> B -> C -> A",
    input=connection.model_dump(),
)
```

``` python
GraphError(
    loc=("connections", 5),
    message="Source port 'image' does not exist on node 'foo'",
    input=connection.model_dump(),
)
```

``` python
GraphError(
    loc=("connections", 7),
    message="Type mismatch: image produces Image but audio expects Text",
    input=connection.model_dump(),
)
```

Then translate all graph errors into one Pydantic `ValidationError`.

------------------------------------------------------------------------

# 29. Useful Pydantic Error Locations

Use locations that identify the actual invalid object.

Good:

``` python
("connections", 2)
```

Good:

``` python
("nodes", 4, "scale")
```

Good:

``` python
("nodes", 4)
```

Acceptable for a global invariant:

``` python
("connections",)
```

Avoid:

``` python
()
```

unless the error truly cannot be associated with a more specific domain
object.

------------------------------------------------------------------------

# 30. Example: Complete Graph Validation Skeleton

``` python
class WorkflowDefinition(BaseModel):
    nodes: list[Node]
    connections: list[Connection]

    @model_validator(mode="after")
    def validate_graph(self) -> "WorkflowDefinition":
        errors: list[dict[str, object]] = []

        errors.extend(validate_node_references(self))
        errors.extend(validate_ports(self))
        errors.extend(validate_types(self))
        errors.extend(validate_required_inputs(self))
        errors.extend(validate_cycles(self))

        if errors:
            raise ValidationError.from_exception_data(
                title="WorkflowDefinition",
                line_errors=errors,
            )

        return self
```

Each validator should have one responsibility.

For example:

``` python
def validate_cycles(
    workflow: WorkflowDefinition,
) -> list[dict[str, object]]:

    result = find_cycle(workflow)

    if result is None:
        return []

    cycle, connection_index = result
    connection = workflow.connections[connection_index]

    cycle_path = " -> ".join(cycle)

    return [
        {
            "type": "value_error",
            "loc": (
                "connections",
                connection_index,
            ),
            "input": connection.model_dump(),
            "ctx": {
                "error": (
                    f"Cycle detected: {cycle_path}. "
                    f"Connection "
                    f"{connection.source_node}."
                    f"{connection.source_port} -> "
                    f"{connection.target_node}."
                    f"{connection.target_port} "
                    f"closes the cycle."
                )
            },
        }
    ]
```

------------------------------------------------------------------------

# 31. Testing Requirements

Every domain model should have tests for:

## Valid construction

``` python
def test_generate_image_node() -> None:
    node = GenerateImageNode(
        id="a",
        model="flux",
    )

    assert node.type == "generate_image"
```

## Invalid configuration

``` python
def test_invalid_scale() -> None:
    with pytest.raises(ValidationError):
        UpscaleNode(
            id="upscale",
            scale=0,
        )
```

## Valid connection

``` text
GenerateImage.image -> Upscale.image
```

## Invalid port

``` text
GenerateImage.no_such_port -> Upscale.image
```

## Invalid type

``` text
GenerateImage.image -> GenerateAudio.prompt
```

## Cycle detection

``` text
A -> B -> C -> A
```

Assert the actual path:

``` python
assert "A -> B -> C -> A" in str(exc.value)
```

Also assert the error location:

``` python
error = exc.value.errors()[0]

assert error["loc"] == (
    "connections",
    2,
)
```

------------------------------------------------------------------------

# 32. Test More Than One Cycle Shape

Cycle detection tests must include:

### Self-loop

``` text
A -> A
```

Expected:

``` text
A -> A
```

### Two-node cycle

``` text
A -> B
B -> A
```

Expected:

``` text
A -> B -> A
```

### Three-node cycle

``` text
A -> B
B -> C
C -> A
```

Expected:

``` text
A -> B -> C -> A
```

### Cycle embedded in a larger DAG

``` text
X -> A -> B -> C -> A
```

Expected cycle:

``` text
A -> B -> C -> A
```

not:

``` text
X -> A -> B -> C -> A
```

### Multiple independent branches

``` text
A -> B
A -> C
B -> D
C -> E
```

No cycle.

### Disconnected cyclic component

``` text
A -> B

X -> Y
Y -> Z
Z -> X
```

Must still detect:

``` text
X -> Y -> Z -> X
```

------------------------------------------------------------------------

# 33. Do Not Confuse Graph Cycles With Runtime Loops

A workflow graph being acyclic and a workflow execution being repetitive
are different concepts.

If the domain needs:

-   retry
-   loop
-   iteration
-   map
-   reduce
-   repair
-   conditional execution

do not automatically introduce arbitrary graph cycles.

Prefer explicit control-flow semantics when possible:

``` text
DAG
 |
 +--> Retry
 +--> Loop
 +--> Map
 +--> Conditional
 +--> Repair
```

This makes execution semantics explicit.

------------------------------------------------------------------------

# 34. Avoid `Any`

`Any` effectively disables type checking.

Bad:

``` python
def execute(node: Any, inputs: Any) -> Any:
    ...
```

Better:

``` python
def execute(
    node: Node,
    inputs: RuntimeValue,
) -> RuntimeValue:
    ...
```

Or use overloads for concrete node/executor correlations.

If an escape hatch is genuinely necessary, isolate it at the boundary
and document why.

------------------------------------------------------------------------

# 35. Avoid Unbounded `object` in Domain APIs

`object` is better than `Any` for some internal implementation
boundaries, but it is still not a domain contract.

Bad:

``` python
def get_output() -> object:
    ...
```

Prefer:

``` python
def get_output() -> Image:
    ...
```

or:

``` python
def get_output() -> RuntimeValue:
    ...
```

depending on the actual contract.

------------------------------------------------------------------------

# 36. Avoid Boolean Flags When Types Better Express States

Bad:

``` python
class Job:
    is_video: bool
    is_audio: bool
    is_image: bool
```

This permits invalid combinations:

``` text
is_video = true
is_audio = true
is_image = false
```

Prefer a discriminated union:

``` python
class ImageJob(BaseModel):
    kind: Literal["image"]


class VideoJob(BaseModel):
    kind: Literal["video"]


class AudioJob(BaseModel):
    kind: Literal["audio"]
```

Types should make invalid states difficult to represent.

------------------------------------------------------------------------

# 37. Avoid Nullable Everything

Bad:

``` python
class Node:
    prompt: str | None
    image: Image | None
    video: Video | None
    audio: Audio | None
```

This creates a large invalid state space.

If different node types have different requirements, model them as
separate types.

------------------------------------------------------------------------

# 38. Avoid Giant Conditional Functions

Bad:

``` python
def execute(node):
    if node.type == "generate_image":
        ...
    elif node.type == "generate_video":
        ...
    elif node.type == "generate_audio":
        ...
    elif node.type == "upscale":
        ...
    elif node.type == "whatever":
        ...
```

A small dispatcher is acceptable.

The node-specific behavior should live in typed executors:

``` python
GenerateImageExecutor
UpscaleExecutor
GenerateVideoExecutor
GenerateAudioExecutor
```

As the number of nodes grows, move toward declarative registration.

------------------------------------------------------------------------

# 39. Auto-Registration Direction

For a larger system, consider:

``` text
NodeSpec
   |
   +-- type_id
   +-- node model
   +-- input ports
   +-- output ports
   +-- executor
```

Then registration becomes:

``` python
registry.register(
    NodeSpec(
        type_id="generate_image",
        node_type=GenerateImageNode,
        input_ports=...,
        output_ports=...,
        executor=GenerateImage(),
    )
)
```

Adding a node should ideally require defining the node contract and
executor once, rather than modifying:

-   node union
-   executor registry
-   dispatcher
-   UI schema
-   runtime type mapping
-   validation switch statements

in unrelated locations.

------------------------------------------------------------------------

# 40. Static Typing vs Dynamic Registration

Dynamic registration is useful at runtime, but static type checkers
cannot infer arbitrary relationships created dynamically.

Therefore:

``` text
Runtime:
    dynamic registry

Compile time:
    explicit typed APIs / overloads / Protocols
```

can coexist.

Do not sacrifice static guarantees merely because runtime discovery is
convenient.

------------------------------------------------------------------------

# 41. Prefer `Protocol` for Behavioral Contracts

Use `Protocol` when an implementation only needs to satisfy behavior.

``` python
class ImageGenerator(Protocol):
    def __call__(
        self,
        node: GenerateImageNode,
        prompt: Text,
    ) -> Image:
        ...
```

A concrete class does not need to inherit:

``` python
class FluxImageGenerator(ImageGenerator):
    ...
```

It only needs to satisfy the protocol:

``` python
class FluxImageGenerator:
    def __call__(
        self,
        node: GenerateImageNode,
        prompt: Text,
    ) -> Image:
        ...
```

This reduces coupling.

------------------------------------------------------------------------

# 42. Use Abstract Base Classes When Shared Implementation Matters

Use `Protocol` for structural typing.

Use `ABC` when you need:

-   shared implementation
-   common state
-   lifecycle hooks
-   enforced inheritance
-   protected methods

Do not use inheritance simply because a class "sounds related."

------------------------------------------------------------------------

# 43. Prefer Immutable Domain Metadata

Port definitions and node specifications should usually be immutable.

``` python
@dataclass(frozen=True)
class PortType:
    type_id: str
    python_type: type
```

This prevents accidental mutation:

``` python
port.port_type = AUDIO_TYPE
```

after the graph contract has already been constructed.

------------------------------------------------------------------------

# 44. Naming Rules

Use domain-specific names.

Good:

``` text
source_node
source_port
target_node
target_port
port_type
runtime_value
node_spec
executor
workflow_definition
```

Avoid vague names:

``` text
data
thing
item
value
obj
stuff
payload
```

unless the abstraction is genuinely generic.

------------------------------------------------------------------------

# 45. Type Aliases Should Clarify, Not Hide

Good:

``` python
NodeId = str
PortName = str
```

Potentially useful:

``` python
RuntimeValue = Text | Image | Video | Audio
```

Bad:

``` python
Data = object
```

A type alias should communicate domain semantics.

------------------------------------------------------------------------

# 46. Use `Final` for Constants That Define Domain Metadata

``` python
from typing import Final


TEXT_TYPE: Final = PortType(
    type_id="text",
    python_type=Text,
)

IMAGE_TYPE: Final = PortType(
    type_id="image",
    python_type=Image,
)
```

This communicates that these are canonical descriptors.

------------------------------------------------------------------------

# 47. Runtime Type Checking

When runtime values have already been parsed into concrete domain
classes:

``` python
if not isinstance(value, Image):
    raise TypeError(
        f"Expected Image, got {type(value).__name__}"
    )
```

Do not compare arbitrary class names:

``` python
if value.__class__.__name__ == "Image":
    ...
```

Do not compare serialized dictionaries deep inside business logic:

``` python
if value["kind"] == "image":
    ...
```

Parse first; operate on typed objects afterward.

------------------------------------------------------------------------

# 48. Runtime Port Validation

Given:

``` python
port: InputPort[Image]
value: RuntimeValue
```

use the explicit runtime descriptor:

``` python
expected_type = port.port_type.python_type

if not isinstance(value, expected_type):
    raise TypeError(
        f"Port {port.name!r} expects "
        f"{expected_type.__name__}, "
        f"got {type(value).__name__}"
    )
```

This is the correct place for runtime validation.

------------------------------------------------------------------------

# 49. Keep Serialization Separate From Domain Logic

Bad:

``` python
def execute(node_json: dict[str, object]) -> dict[str, object]:
    ...
```

Prefer:

``` text
JSON
  |
  v
Pydantic parsing
  |
  v
typed domain model
  |
  v
domain execution
  |
  v
typed result
  |
  v
serialization
```

Business logic should not constantly parse dictionaries.

------------------------------------------------------------------------

# 50. Error Messages Must Be Actionable

Bad:

``` text
Invalid workflow.
```

Better:

``` text
connections.2:
Cycle detected: A -> B -> C -> A.
Connection C.image -> A.image closes the cycle.
```

Bad:

``` text
Invalid port.
```

Better:

``` text
connections.4:
Target port 'prompt' does not exist on node 'upscale'.
Available ports: image.
```

Bad:

``` text
Type mismatch.
```

Better:

``` text
connections.5:
generate.image produces Image, but
generate_audio.prompt expects Text.
```

The error should answer:

1.  What is wrong?
2.  Where is it wrong?
3.  What was expected?
4.  What was received?
5.  How can the user fix it?

------------------------------------------------------------------------

# 51. Do Not Hide Domain Errors Behind Generic Exceptions

Bad:

``` python
try:
    ...
except Exception:
    raise ValueError("Workflow invalid")
```

This destroys useful information.

Prefer specific exceptions or structured Pydantic errors.

If an exception must be translated, preserve the original context.

------------------------------------------------------------------------

# 52. Domain Invariants Belong Near the Domain

If a rule is:

``` text
Upscale.scale must be > 0
```

put it on `UpscaleNode`.

If a rule is:

``` text
connections cannot contain cycles
```

put it on workflow/graph validation.

If a rule is:

``` text
executor must return the node's declared output type
```

enforce it in the execution layer.

Do not put every rule into one giant validator.

------------------------------------------------------------------------

# 53. Recommended Project Structure

For a moderately complex domain:

``` text
domain/
    __init__.py

    types.py
        Text
        Image
        Video
        Audio
        RuntimeValue

    ports.py
        PortType
        InputPort
        OutputPort

    nodes/
        __init__.py
        base.py
        generate_image.py
        generate_video.py
        generate_audio.py
        upscale.py

    graph/
        connection.py
        validation.py
        cycles.py

    execution/
        protocols.py
        registry.py

    workflow/
        definition.py
```

Do not put the entire domain into:

``` text
models.py
```

once it becomes large enough to have meaningful subdomains.

------------------------------------------------------------------------

# 54. Example: End-to-End Domain

``` python
class GenerateImageNode(Node):
    type: Literal["generate_image"] = "generate_image"
    model: str

    def input_ports(self) -> dict[str, InputPort[Text]]:
        return {
            "prompt": InputPort(
                name="prompt",
                port_type=TEXT_TYPE,
            )
        }

    def output_ports(self) -> dict[str, OutputPort[Image]]:
        return {
            "image": OutputPort(
                name="image",
                port_type=IMAGE_TYPE,
            )
        }


class UpscaleNode(Node):
    type: Literal["upscale"] = "upscale"
    scale: int = Field(gt=0)

    def input_ports(self) -> dict[str, InputPort[Image]]:
        return {
            "image": InputPort(
                name="image",
                port_type=IMAGE_TYPE,
            )
        }

    def output_ports(self) -> dict[str, OutputPort[Image]]:
        return {
            "image": OutputPort(
                name="image",
                port_type=IMAGE_TYPE,
            )
        }
```

Typed executor inputs:

``` python
class GenerateImageInputs(TypedDict):
    prompt: Text


class GenerateImageOutputs(TypedDict):
    image: Image


class UpscaleInputs(TypedDict):
    image: Image


class UpscaleOutputs(TypedDict):
    image: Image
```

Typed executors:

``` python
class GenerateImageExecutor(Protocol):
    def __call__(
        self,
        node: GenerateImageNode,
        inputs: GenerateImageInputs,
    ) -> GenerateImageOutputs:
        ...


class UpscaleExecutor(Protocol):
    def __call__(
        self,
        node: UpscaleNode,
        inputs: UpscaleInputs,
    ) -> UpscaleOutputs:
        ...
```

This produces a strongly typed chain:

``` text
GenerateImageNode
    prompt: Text
    image: Image
         |
         v
UpscaleNode
    image: Image
```

------------------------------------------------------------------------

# 55. What "Strongly Typed" Means in This Skill

A solution is strongly typed when the important domain relationships are
visible to the type checker.

For example:

``` python
GenerateImageNode
    Text -> Image

UpscaleNode
    Image -> Image

GenerateVideoNode
    Text -> Video

GenerateAudioNode
    Text -> Audio
```

The code should make it difficult to accidentally connect:

``` text
Image -> Audio
```

or invoke:

``` python
upscale(Text(...))
```

without an explicit unsafe escape hatch.

------------------------------------------------------------------------

# 56. What "Well Structured" Means

A well-structured implementation has clear boundaries:

``` text
Domain values
    ↓
Ports/contracts
    ↓
Nodes
    ↓
Connections
    ↓
Graph validation
    ↓
Execution contracts
    ↓
Executors
    ↓
Runtime registry
```

No layer should secretly own concepts belonging to another layer.

------------------------------------------------------------------------

# 57. Do's

## Do

-   Use concrete domain classes.
-   Use Pydantic for external/runtime validation.
-   Use `Literal` discriminators for polymorphic serialized models.
-   Use generics for typed port contracts.
-   Keep explicit runtime type metadata.
-   Use `Protocol` for executor behavior.
-   Use overloads when a dispatcher needs node-specific return types.
-   Use `TypedDict` for named collections of typed inputs/outputs.
-   Validate graph invariants explicitly.
-   Report full cycle paths.
-   Attach graph errors to specific nodes/connections.
-   Collect independent validation errors where practical.
-   Keep graph algorithms independent of Pydantic.
-   Use stable wire identifiers.
-   Write tests for valid and invalid domain states.
-   Keep domain behavior out of raw JSON dictionaries.
-   Prefer narrow return types.
-   Prefer types that make invalid states unrepresentable.
-   Centralize domain metadata where duplication would otherwise drift.
-   Separate static type guarantees from runtime validation.

------------------------------------------------------------------------

# 58. Don'ts

## Don't

-   Don't use `dict[str, Any]` as the domain model.
-   Don't use `Any` as the default escape hatch.
-   Don't model every domain value as `str`.
-   Don't use strings instead of semantic domain types.
-   Don't rely on generic parameters for runtime validation.
-   Don't duplicate node contracts in multiple unrelated places.
-   Don't let executors disagree with node port contracts.
-   Don't make one giant `execute()` function contain all business
    logic.
-   Don't use class names as persistent wire identifiers.
-   Don't report only "Cycle detected".
-   Don't raise an unstructured `ValueError` for graph validation when a
    structured Pydantic error is available.
-   Don't attach every graph error to the root.
-   Don't silently ignore invalid node/port references.
-   Don't mix serialization logic into core domain behavior.
-   Don't use nullable fields to represent many unrelated variants.
-   Don't introduce arbitrary graph cycles merely to model retries or
    iterations.
-   Don't over-engineer abstractions before repeated domain structure
    exists.
-   Don't sacrifice static typing merely for dynamic convenience.

------------------------------------------------------------------------

# 59. Decision Guide

When designing a new concept, ask:

### Is it a runtime domain value?

Use:

``` python
class Image(BaseModel):
    ...
```

### Is it a port contract?

Use:

``` python
InputPort[Image]
OutputPort[Image]
```

### Does it need runtime type information?

Use:

``` python
PortType(
    type_id="image",
    python_type=Image,
)
```

### Is it a polymorphic serialized model?

Use:

``` python
Annotated[
    A | B | C,
    Field(discriminator="type"),
]
```

### Is it behavior that implementations should satisfy?

Use:

``` python
Protocol
```

### Does it have named typed fields?

Use:

``` python
TypedDict
```

### Is it graph-wide?

Implement explicit graph validation.

### Is it a graph cycle?

Use DFS with a recursion path and report:

``` text
A -> B -> C -> A
```

### Does the error correspond to a particular graph object?

Use a Pydantic location such as:

``` python
("connections", index)
```

### Does it repeat across multiple layers?

Consider a shared `NodeSpec` / registry rather than copying the
contract.

------------------------------------------------------------------------

# 60. Final Quality Checklist

Before considering a domain-model implementation complete, verify:

## Domain modeling

-   [ ] Every important domain concept has a concrete type.
-   [ ] Invalid states are difficult to represent.
-   [ ] Polymorphic objects have explicit discriminators.
-   [ ] Persistent identifiers are stable.

## Type safety

-   [ ] No unnecessary `Any`.
-   [ ] No unnecessary `object`.
-   [ ] Node inputs and outputs have concrete types.
-   [ ] Executor signatures match node contracts.
-   [ ] Named input/output maps use `TypedDict` where appropriate.
-   [ ] Port generics communicate value types.
-   [ ] Runtime port metadata exists independently of generic
    parameters.

## Runtime validation

-   [ ] External data is parsed through Pydantic.
-   [ ] Node references are validated.
-   [ ] Ports are validated.
-   [ ] Port types are validated.
-   [ ] Required inputs are validated.
-   [ ] Graph invariants are validated.

## Graph validation

-   [ ] Cycle detection exists where DAG semantics are required.
-   [ ] Self-loops are detected.
-   [ ] Multi-node cycles are detected.
-   [ ] Disconnected cycles are detected.
-   [ ] Full cycle paths are reported.
-   [ ] The offending connection is identified.
-   [ ] Pydantic errors have useful `loc` values.

## Architecture

-   [ ] Graph algorithms do not depend unnecessarily on Pydantic.
-   [ ] Serialization is separate from domain logic.
-   [ ] Executor behavior is separate from node configuration.
-   [ ] Registry/dispatch does not become the sole domain model.
-   [ ] Repeated contracts have a clear source of truth.

## Tests

-   [ ] Valid models.
-   [ ] Invalid models.
-   [ ] Valid connections.
-   [ ] Missing node errors.
-   [ ] Missing port errors.
-   [ ] Type mismatch errors.
-   [ ] Self-loop.
-   [ ] Two-node cycle.
-   [ ] Three-node cycle.
-   [ ] Embedded cycle.
-   [ ] Disconnected cycle.
-   [ ] Error locations.
-   [ ] Error messages.

------------------------------------------------------------------------

# 61. Golden Rule

When choosing between a flexible but weakly typed implementation and a
slightly more explicit implementation, prefer the explicit
implementation when the domain relationship is important.

The desired outcome is code where a reader and a type checker can
answer:

``` text
What is this thing?
What inputs does it accept?
What outputs does it produce?
What ports exist?
What types flow through those ports?
What connections are valid?
What graph states are invalid?
Which executor handles this node?
What will happen when validation fails?
Where exactly is the error?
```

without reverse-engineering a collection of dictionaries, strings,
conditionals, and implicit conventions.

Strong domain modeling is not about adding types everywhere.

It is about making the important rules of the system explicit,
machine-checkable, and difficult to violate.
