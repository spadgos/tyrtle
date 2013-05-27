## Tyrtle is a Javascript unit testing framework

Tyrtle has been designed for simplicity and legibility, with minimal pollution of the global namespace.

Here's an example of how you can write an assertion:

```javascript
assert.that(Math.sqrt(49)).is(7).since("The square root of 49 should be 7");
```

If that's too much typing for you, it's good to know that Tyrtle gives you a fine heaping of syntactic sugar: `that`, `is` and `since` are all completely optional! If you prefer a terser syntax, the exact same assertion can be written like this:

```javascript
assert(Math.sqrt(49))(7)("The square root of 49 should be 7");
```

- [Full documentation is on the wiki](https://github.com/spadgos/tyrtle/wiki).
- Tyrtle has a sister project called **Myrtle** which you might also like!

## Development

To build the source files (in the `src` directory) into the compiled `Tyrtle.js` file, simply run:

```shell
make
``` 

---------------

### Myrtle is a Javascript mocking framework

- Mocking (spying and stubbing functions)
- Mock function generation
- Timer manipulation
- Speed profiling

[Check it out](http://github.com/spadgos/myrtle).
