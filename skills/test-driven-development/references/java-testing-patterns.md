# Testing Patterns Reference (Java)

Java testing patterns — JUnit 5, AssertJ, a fake repository, and Spring Boot's MockMvc — illustrating the universal principles from the `test-driven-development` skill. It is the Java counterpart of the JavaScript/TypeScript reference in `../../../references/testing-patterns.md`, using the same `TaskService` scenario.

The conventions below follow practitioner-maintained Java code, notably the test suite of [seed4j](https://github.com/seed4j/seed4j) (JUnit 5, AssertJ, Maven, Spring Boot). They are a starting point: **the repository's existing tests win.** If neighboring tests use Mockito-heavy style, Hamcrest, TestNG, or Kotlin, match them and use this file only for the principles.

## Table of Contents

- [Run the Repository's Own Commands](#run-the-repositorys-own-commands)
- [RED: A Failing Test](#red-a-failing-test)
- [GREEN: Minimal Implementation](#green-minimal-implementation)
- [Test Naming and Structure](#test-naming-and-structure)
- [Assertions (AssertJ)](#assertions-assertj)
- [Parameterized Tests](#parameterized-tests)
- [Fakes Over Mocks](#fakes-over-mocks)
- [Value Types Are Cheap to Test](#value-types-are-cheap-to-test)
- [Integration Tests (Spring Boot)](#integration-tests-spring-boot)
- [Test Anti-Patterns in Java](#test-anti-patterns-in-java)

## Run the Repository's Own Commands

Use the checked-in wrapper when there is one (`./mvnw`, `./gradlew`), and read the build file to see how unit and integration tests are split before choosing a command.

| Goal | Maven | Gradle |
|---|---|---|
| One test class | `./mvnw -Dtest=TaskServiceTest test` | `./gradlew test --tests TaskServiceTest` |
| One test method | `./mvnw -Dtest=TaskServiceTest#shouldCreateTaskWithPendingStatus test` | `./gradlew test --tests 'TaskServiceTest.shouldCreateTaskWithPendingStatus'` |
| Unit tests only | `./mvnw test` | `./gradlew test` |
| Full suite | `./mvnw verify` | `./gradlew check` |

With Maven's default plugin setup, Surefire runs `*Test` classes during `test` and Failsafe runs `*IT` classes only during `verify`. A green `./mvnw test` therefore does **not** prove the integration tests pass — run the full-suite command before declaring done. In a multi-module build, a focused run may need `-pl <module>` (Maven) or a module-qualified task such as `:service:test` (Gradle); check how the repository's CI invokes it.

## RED: A Failing Test

A test class that does not compile is a valid RED for a method that does not exist yet, but prefer a stub that compiles so the test fails on the *assertion*. That proves the test can fail for the right reason.

```java
// RED: createTask does not exist yet (or returns the wrong thing)
class TaskServiceTest {

  private final InMemoryTaskRepository tasks = new InMemoryTaskRepository();
  private final TaskService taskService = new TaskService(tasks, Clock.systemUTC());

  @Test
  void shouldCreateTaskWithPendingStatus() {
    Task task = taskService.createTask("Buy groceries");

    assertThat(task.id()).isNotNull();
    assertThat(task.title()).isEqualTo("Buy groceries");
    assertThat(task.status()).isEqualTo(TaskStatus.PENDING);
    assertThat(task.createdAt()).isNotNull();
  }
}
```

## GREEN: Minimal Implementation

```java
public class TaskService {

  private final TaskRepository tasks;
  private final Clock clock;

  public TaskService(TaskRepository tasks, Clock clock) {
    this.tasks = tasks;
    this.clock = clock;
  }

  public Task createTask(String title) {
    Task task = new Task(UUID.randomUUID(), title, TaskStatus.PENDING, Instant.now(clock), null);
    tasks.save(task);
    return task;
  }
}
```

Inject the `Clock` rather than calling `Instant.now()` directly: it keeps time-dependent behavior deterministic (see "Prove-It Pattern" below) without mocking static methods.

### Prove-It Pattern in Java

```java
// Bug: "Completing a task doesn't record completedAt"
@Test
void shouldRecordCompletionTimeWhenCompleted() {
  Clock fixedClock = Clock.fixed(Instant.parse("2025-01-02T10:00:00Z"), ZoneOffset.UTC);
  TaskService service = new TaskService(tasks, fixedClock);
  Task task = service.createTask("Test");

  Task completed = service.completeTask(task.id());

  assertThat(completed.status()).isEqualTo(TaskStatus.COMPLETED);
  assertThat(completed.completedAt()).isEqualTo(Instant.parse("2025-01-02T10:00:00Z")); // fails → bug confirmed
}
```

Run it and watch it fail on the `completedAt` assertion (`expected: 2025-01-02T10:00:00Z but was: null`), not on a compile error. Then fix the method and run the full suite:

```java
public Task completeTask(UUID id) {
  Task task = tasks.findById(id).orElseThrow();
  Task completed = new Task(task.id(), task.title(), TaskStatus.COMPLETED, task.createdAt(), Instant.now(clock)); // completedAt was missing
  tasks.save(completed);
  return completed;
}
```

## Test Naming and Structure

- Name the behavior, not the method: `shouldRejectBlankTitle`, `shouldNotCompleteUnknownTask`. Many Java codebases use a `should…` prefix; follow whatever the repository already does.
- Test classes are named after the class under test: `TaskServiceTest` (unit), `TaskControllerIT` (integration, if the build uses the `*IT` split).
- A custom meta-annotation can bundle the repeated class-level setup. It makes the test size visible at a glance, and a plain `@UnitTest` class by definition starts no Spring context:

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Tag("unit")
public @interface UnitTest {}
```

  The integration counterpart (`@IntegrationTest`) typically carries `@SpringBootTest` and any active profile. Reuse such annotations if the repository already has them rather than adding new ones.

- Group related tests with `@Nested` and `@DisplayName` when one class covers several behaviors of the same unit. Keep each test method independent of the others.

Arrange-Act-Assert reads the same as in any language; a blank line between the three phases is usually enough in Java, so comment labels are optional.

## Assertions (AssertJ)

Prefer AssertJ's fluent `assertThat` over JUnit's `assertEquals`: failure messages show the actual value and the intent reads left to right.

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

assertThat(task.title()).isEqualTo("Buy groceries");
assertThat(tasks.findAll()).hasSize(2);
assertThat(titles).containsExactly("first", "second");        // order matters
assertThat(titles).containsExactlyInAnyOrder("b", "a");       // order doesn't
assertThat(maybeTask).isEmpty();                              // Optional
assertThat(task).usingRecursiveComparison().isEqualTo(expected);

// Exceptions: assert the type AND the message, so the right failure is proven
assertThatThrownBy(() -> taskService.createTask(" "))
  .isExactlyInstanceOf(IllegalArgumentException.class)
  .hasMessageContaining("title");
```

`assertThatThrownBy` is the Java equivalent of `expect(() => …).toThrow(…)`. Avoid `@Test(expected = …)` and bare `try`/`catch` blocks: the first cannot assert the message and the second passes silently when nothing is thrown.

## Parameterized Tests

Use `@ParameterizedTest` when the same behavior has several inputs. Keep each case a single concept — this does not conflict with DAMP, because the case table *is* the specification.

```java
@ParameterizedTest
@ValueSource(strings = { "", " ", "\t", "\n" })
void shouldRejectBlankTitles(String title) {
  assertThatThrownBy(() -> taskService.createTask(title))
    .isExactlyInstanceOf(IllegalArgumentException.class);
}

static Stream<Arguments> trimmedTitles() {
  return Stream.of(
    Arguments.of("  Buy groceries  ", "Buy groceries"),
    Arguments.of("Buy groceries", "Buy groceries")
  );
}

@ParameterizedTest
@MethodSource("trimmedTitles")
void shouldTrimTitles(String input, String expected) {
  assertThat(taskService.createTask(input).title()).isEqualTo(expected);
}
```

Do not use a loop inside a single `@Test` instead: the first failing input hides the rest and the report names no case.

## Fakes Over Mocks

The skill's preference order (real > fake > stub > mock) applies directly. An in-memory implementation of a repository interface is a few lines, behaves like the real thing, and survives refactoring:

```java
class InMemoryTaskRepository implements TaskRepository {

  private final Map<UUID, Task> tasks = new LinkedHashMap<>();

  @Override
  public void save(Task task) {
    tasks.put(task.id(), task);
  }

  @Override
  public Optional<Task> findById(UUID id) {
    return Optional.ofNullable(tasks.get(id));
  }

  @Override
  public List<Task> findAll() {
    return List.copyOf(tasks.values());
  }
}
```

```java
// Good: state-based, survives refactoring
@Test
void shouldListNewestTasksFirst() {
  taskService.createTask("older");
  taskService.createTask("newer");

  assertThat(taskService.listTasks()).extracting(Task::title).containsExactly("newer", "older");
}

// Bad: interaction-based, breaks when the implementation changes
@Test
void shouldCallRepositorySave() {
  TaskRepository repository = mock(TaskRepository.class);
  new TaskService(repository, Clock.systemUTC()).createTask("x");
  verify(repository).save(any());   // proves a call happened, not that the behavior is right
}
```

Reach for Mockito at true boundaries — an HTTP client to a third party, a mail sender, a payment gateway — where a fake is not worth writing. Where a real dependency is cheap, use it: write to a temporary directory (JUnit's `@TempDir`) instead of mocking the file system, and use an in-memory or containerized database instead of mocking the persistence layer. For crash or rollback behavior, exercise the real boundary: a mocked transaction does not roll back.

## Value Types Are Cheap to Test

Wrapping a business concept in its own type (`Title` instead of `String`) moves validation into the constructor, and the tests become small, fast, and exhaustive:

```java
@UnitTest
class TitleTest {

  @Test
  void shouldNotBuildWithoutTitle() {
    assertThatThrownBy(() -> new Title(null)).isExactlyInstanceOf(IllegalArgumentException.class).hasMessageContaining("title");
  }

  @Test
  void shouldTrimTitle() {
    assertThat(new Title("  Buy groceries  ").value()).isEqualTo("Buy groceries");
  }

  @Test
  void shouldNotBuildWithTooLongTitle() {
    assertThatThrownBy(() -> new Title("a".repeat(256))).isExactlyInstanceOf(IllegalArgumentException.class);
  }
}
```

This is where most of the suite should live — small tests with no framework, no I/O, and millisecond runtimes.

## Integration Tests (Spring Boot)

Reserve Spring contexts for behavior that crosses a boundary: HTTP mapping, serialization, error handling, wiring. Slice the context to what is needed where the project supports it.

```java
@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerIT {

  @Autowired
  private MockMvc rest;

  @Test
  void shouldCreateTask() throws Exception {
    rest
      .perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Buy groceries\"}"))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("title").value("Buy groceries"))
      .andExpect(jsonPath("status").value("PENDING"));
  }

  @Test
  void shouldRejectBlankTitleWithBadRequest() throws Exception {
    rest
      .perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\" \"}"))
      .andExpect(status().isBadRequest());
  }
}
```

Spring contexts are slow to start and are cached per configuration. Avoid `@DirtiesContext` and per-test property overrides unless required — each distinct configuration costs another context startup. Package names and annotations vary between Spring Boot versions (for example, where `@AutoConfigureMockMvc` lives); copy the imports from an existing integration test in the repository.

## Test Anti-Patterns in Java

| Anti-Pattern | Problem | Fix |
|---|---|---|
| `Thread.sleep` in a test | Slow and still flaky | Inject a `Clock`, or poll with Awaitility and a timeout |
| `@Test(expected = …)` / bare `try`/`catch` | Cannot assert the message; `try`/`catch` passes when nothing is thrown | `assertThatThrownBy` |
| Static mocking (`mockStatic`) for time or randomness | Hides a design seam and is fragile | Inject `Clock` / a random source |
| `@SpringBootTest` for pure logic | Seconds per test class instead of milliseconds | Plain unit test with `new` |
| Shared mutable fields across tests | Order-dependent failures | Fresh state per test (JUnit creates a new instance per method; keep fields instance-level, not `static`) |
| Verifying every call with Mockito | Tests the implementation, not the behavior | Use a fake and assert on resulting state |
| Disabled tests (`@Disabled`) left in | Silent coverage loss | Fix or delete; never skip to make the suite pass |
| Asserting `toString()` output | Breaks on cosmetic changes | Assert on fields or use recursive comparison |
